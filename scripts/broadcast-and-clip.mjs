import fs from "node:fs";
import { parseEnv } from "node:util";
import { spawn } from "node:child_process";
import { moments } from "../public/moments.js";
import { action } from "./automation-client.mjs";
const local = fs.existsSync(".env")
  ? parseEnv(fs.readFileSync(".env", "utf8"))
  : {};
const key = (
  process.env.TWITCH_STREAM_KEY ||
  local.TWITCH_STREAM_KEY ||
  ""
).trim();
if (!key)
  throw new Error(
    "Set TWITCH_STREAM_KEY privately in the ignored .env file. Never paste it in chat.",
  );
const status = await action("/api/automation/status");
if (!status.ready || status.user.login !== "sjathedude")
  throw new Error(
    "Authorize sjathedude with the helper's clipping, channel management, and download scopes first.",
  );
if (!key.startsWith(`live_${status.user.id}_`))
  throw new Error(
    "The private stream key does not match the authorized broadcaster. Its value was suppressed.",
  );
const channel = await action("/api/automation/channel");
if (channel.live)
  throw new Error(
    "The channel is already live. This helper will not replace an active broadcast.",
  );
const source = "/tmp/callback-broadcast/original-scenes.mp4";
if (!fs.existsSync(source))
  throw new Error("Run npm run automation:render first.");
const response = await fetch("https://ingest.twitch.tv/ingests");
if (!response.ok)
  throw new Error("The official Twitch ingest list is unavailable.");
const ingests = (await response.json()).ingests;
const ingest =
  ingests.find((item) => /global/i.test(item.name + item.url_template)) ||
  ingests[0];
const target = new URL(ingest.url_template.replace("{stream_key}", ""));
if (
  target.protocol !== "rtmp:" ||
  !/\.(live-video\.net|video\.net|twitch\.tv)$/.test(target.hostname)
)
  throw new Error(
    "The official ingest response contained an unexpected endpoint.",
  );
const publishURL = new URL(target);
publishURL.pathname = publishURL.pathname.replace(/\/$/, "") + "/" + key;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clips = [];
let encoder;
let stopped = false;
const cleanup = () => {
  stopped = true;
  encoder?.kill("SIGINT");
};
process.once("SIGINT", cleanup);
process.once("SIGTERM", cleanup);
async function until(at) {
  while (Date.now() < at) {
    if (stopped) throw new Error("Broadcast stopped.");
    await wait(Math.min(1000, at - Date.now()));
  }
}
async function confirmClip(created, moment) {
  const item = {
    id: created.id,
    editUrl: created.edit_url,
    intendedTitle: moment.title,
    status: "processing",
  };
  clips.push(item);
  for (let attempt = 0; attempt < 20; attempt++) {
    await wait(3000);
    const result = await action(
      "/api/automation/clip?id=" + encodeURIComponent(item.id),
    );
    if (result.clip) {
      item.actualTitle = result.clip.title;
      item.titleMatches = item.actualTitle === moment.title;
      item.url = result.clip.url;
      item.status = "published";
      break;
    }
  }
  if (item.status !== "published")
    item.status = "not confirmed within 60 seconds";
  fs.writeFileSync(
    "/tmp/callback-created-clips.json",
    JSON.stringify(clips, null, 2),
    { mode: 0o600 },
  );
  console.log(
    `${moment.id}: ${item.status}${item.status === "published" ? (item.titleMatches ? "; exact title verified" : "; manual title edit needed") : ""}`,
  );
}
try {
  await action("/api/automation/title", { moment: moments[0].id });
  encoder = spawn(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-re",
      "-i",
      source,
      "-f",
      "lavfi",
      "-i",
      "anullsrc=r=48000:cl=stereo",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-tune",
      "zerolatency",
      "-b:v",
      "4500k",
      "-maxrate",
      "4500k",
      "-bufsize",
      "9000k",
      "-g",
      "60",
      "-keyint_min",
      "60",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-ar",
      "48000",
      "-shortest",
      "-rtmp_app",
      "app",
      "-f",
      "flv",
      publishURL.toString(),
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  let stderr = "";
  encoder.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
    const lines = stderr.split("\n");
    stderr = lines.pop();
    for (const line of lines)
      if (line.trim())
        console.error(
          line
            .replaceAll(key, "[redacted]")
            .replace(/rtmp:\/\/\S+/g, "[ingest endpoint]"),
        );
  });
  encoder.on("error", () => {
    stopped = true;
    console.error(
      "The encoder could not start. Check that ffmpeg is installed.",
    );
  });
  let exitCode;
  encoder.on("exit", (code) => {
    exitCode = code;
  });
  const start = Date.now();
  console.log(
    "Original-content broadcast started. Encoder logs redact the stream key and publishing URL.",
  );
  for (let attempt = 0; attempt < 30; attempt++) {
    if (stopped || exitCode !== undefined)
      throw new Error(
        "The encoder stopped before Twitch confirmed the stream.",
      );
    if ((await action("/api/automation/channel")).live) break;
    if (attempt === 29)
      throw new Error(
        "Twitch did not report the broadcast live within 30 seconds.",
      );
    await wait(1000);
  }
  const confirmations = [];
  for (let i = 0; i < moments.length; i++) {
    const moment = moments[i];
    await until(start + i * 50000);
    if (i) await action("/api/automation/title", { moment: moment.id });
    let applied = false;
    for (let check = 0; check < 10; check++) {
      if (
        (await action("/api/automation/channel")).channel.title === moment.title
      ) {
        applied = true;
        break;
      }
      await wait(1000);
    }
    if (!applied)
      throw new Error(
        "The intended stream title did not apply; clip creation paused.",
      );
    await until(start + i * 50000 + 37000);
    if (exitCode !== undefined)
      throw new Error("The encoder stopped before all moments were clipped.");
    const created = await action("/api/automation/create-clip", {
      moment: moment.id,
    });
    if (!created.data?.[0]?.id)
      throw new Error("Twitch did not return a clip ID.");
    confirmations.push(confirmClip(created.data[0], moment));
  }
  await Promise.all(confirmations);
  const lines = [
    "# Automated clip results",
    "",
    "Original content broadcast on sjathedude. Clip IDs and titles below come from real API responses.",
    "",
    "| Clip ID | Intended title | Confirmed title | Result |",
    "| --- | --- | --- | --- |",
    ...clips.map(
      (clip) =>
        `| ${clip.id} | ${clip.intendedTitle} | ${clip.actualTitle || "Not returned"} | ${clip.titleMatches ? "Verified" : "Check private edit link"} |`,
    ),
    "",
    "Private edit links are saved in /tmp/callback-created-clips.json. If a title differs, rename it there before rebuilding the demo index.",
    "",
  ];
  fs.writeFileSync("docs/CREATED_CLIPS.md", lines.join("\n"));
  console.log(
    "Real clip results written to docs/CREATED_CLIPS.md. No title-inheritance assumption was used.",
  );
} finally {
  cleanup();
  await action("/api/automation/title", { restore: true }).catch(() =>
    console.error(
      "Original stream title could not be restored; check the channel settings.",
    ),
  );
}
