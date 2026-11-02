import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { clips, demoLibrary } from "../public/data.js";
import { action } from "./automation-client.mjs";
if (!clips.length) throw new Error("Index the owner's published clips first.");
const status = await action("/api/automation/status");
if (!status.ready || status.user.id !== demoLibrary.broadcaster.id)
  throw new Error("Authorize the indexed owner for clip downloads.");
fs.mkdirSync("public/media", { recursive: true });
for (const clip of clips) {
  if (
    clip.broadcasterId !== status.user.id ||
    !/^[a-zA-Z0-9_-]+$/.test(clip.id)
  )
    throw new Error("Clip ownership or ID validation failed.");
  const result = await action("/api/automation/download", { id: clip.id });
  const download = result.data?.[0]?.landscape_download_url;
  if (!download || new URL(download).protocol !== "https:")
    throw new Error(
      "Twitch has not provided an HTTPS download for an owned clip.",
    );
  const response = await fetch(download);
  if (!response.ok)
    throw new Error(`Owned clip download failed (HTTP ${response.status}).`);
  const temporary = `/tmp/callback-owned-${clip.id}.mp4`;
  fs.writeFileSync(temporary, Buffer.from(await response.arrayBuffer()));
  const target = `public/media/owned-${clip.id}.mp4`;
  const encode = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      temporary,
      "-an",
      "-vf",
      "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "24",
      "-movflags",
      "+faststart",
      target,
    ],
    { stdio: "inherit" },
  );
  fs.rmSync(temporary, { force: true });
  if (encode.status || fs.statSync(target).size > 24 * 1024 * 1024)
    throw new Error(
      "Owned clip could not be prepared within the hosting size limit.",
    );
  console.log(`Prepared original owned media: ${clip.title}`);
}
console.log(
  "Run the owned demo index again to attach these verified local media paths, then deploy.",
);
