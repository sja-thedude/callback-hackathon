import fs from "node:fs";
import { parseEnv } from "node:util";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { action } from "./automation-client.mjs";
export async function publishPage(initialPage) {
  const env = fs.existsSync(".env")
    ? parseEnv(fs.readFileSync(".env", "utf8"))
    : {};
  const key = (
    process.env.TWITCH_STREAM_KEY ||
    env.TWITCH_STREAM_KEY ||
    ""
  ).trim();
  const status = await action("/api/automation/status");
  if (!status.ready || !key.startsWith(`live_${status.user.id}_`))
    throw new Error("The private stream key and authorized owner must match.");
  if ((await action("/api/automation/channel")).live)
    throw new Error(
      "An existing broadcast is active. Wait for it to end before recording.",
    );
  const result = await fetch("https://ingest.twitch.tv/ingests");
  if (!result.ok) throw new Error("The official ingest list is unavailable.");
  const ingests = (await result.json()).ingests;
  const server =
    ingests.find((item) => /global/i.test(item.name + item.url_template)) ||
    ingests[0];
  const url = new URL(server.url_template.replace("{stream_key}", key));
  if (
    url.protocol !== "rtmp:" ||
    !/\.(live-video\.net|video\.net|twitch\.tv)$/.test(url.hostname)
  )
    throw new Error("Unexpected ingest endpoint.");
  let page = initialPage,
    active = true,
    frames = 0,
    failure;
  const encoder = spawn(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-use_wallclock_as_timestamps",
      "1",
      "-f",
      "image2pipe",
      "-vcodec",
      "mjpeg",
      "-framerate",
      "15",
      "-i",
      "pipe:0",
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
      "-r",
      "30",
      "-g",
      "60",
      "-b:v",
      "4500k",
      "-maxrate",
      "4500k",
      "-bufsize",
      "9000k",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-shortest",
      "-f",
      "flv",
      url.toString(),
    ],
    { stdio: ["pipe", "ignore", "pipe"] },
  );
  let errors = "";
  encoder.stderr.on("data", (chunk) => {
    errors += chunk.toString();
    const lines = errors.split("\n");
    errors = lines.pop();
    for (const line of lines)
      if (line.trim())
        console.error(
          line
            .replaceAll(key, "[redacted]")
            .replace(/rtmp:\/\/\S+/g, "[ingest endpoint]"),
        );
  });
  encoder.on("error", () => {
    failure = "The stream encoder could not start.";
    active = false;
  });
  encoder.on("exit", (code) => {
    if (active && code !== 0) failure = "The live encoder stopped.";
    active = false;
  });
  encoder.stdin.on("error", () => {
    failure = "The encoder input closed.";
    active = false;
  });
  const clients = new Map();
  async function capture(target) {
    if (!clients.has(target)) clients.set(target, target.createCDPSession());
    const client = await clients.get(target);
    const frame = await client.send("Page.captureScreenshot", { format: "jpeg", quality: 82, captureBeyondViewport: false, fromSurface: true });
    return Buffer.from(frame.data, "base64");
  }
  const loop = (async () => {
    try {
      while (active) {
        const start = Date.now();
        const frame = await capture(page);
        if (!active) break;
        if (!encoder.stdin.write(frame)) await once(encoder.stdin, "drain");
        frames++;
        await new Promise((resolve) =>
          setTimeout(resolve, Math.max(0, 1000 / 15 - (Date.now() - start))),
        );
      }
    } catch {
      if (active)
        failure = "Browser frames could not reach the stream encoder.";
      active = false;
    }
  })();
  return {
    setPage(next) {
      page = next;
    },
    check() {
      if (failure) throw new Error(failure);
      return { frames };
    },
    async stop() {
      active = false;
      encoder.stdin.end();
      encoder.kill("SIGINT");
      await Promise.race([
        loop,
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    },
  };
}
