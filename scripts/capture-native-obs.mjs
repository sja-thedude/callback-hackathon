import fs from "node:fs";
import { connectOBS } from "./obs-client.mjs";
export async function captureNativeOBS(phase) {
  if (!["on-air", "exit"].includes(phase)) throw new Error("Choose a known native verification phase.");
  const context = JSON.parse(fs.readFileSync("/tmp/callback-live-obs.json", "utf8"));
  const obs = await connectOBS(JSON.parse(fs.readFileSync(process.env.OBS_ACCESS_FILE || "/tmp/callback-obs-access.json", "utf8")));
  try {
    const version = await obs.call("GetVersion");
    const shot = await obs.call("GetSourceScreenshot", { sourceName: context.source, imageFormat: "png", imageWidth: 1920, imageHeight: 1080 });
    fs.writeFileSync(`docs/screenshots/obs-live-${phase}.png`, Buffer.from(shot.imageData.split(",")[1], "base64"));
    const file = "docs/OBS_LIVE_VERIFICATION.json";
    const report = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { source: "authenticated owner studio", sourceKind: "browser_source", canvas: { width: 1920, height: 1080 }, obsVersion: version.obsVersion };
    report[phase] = { capturedAt: new Date().toISOString(), file: `screenshots/obs-live-${phase}.png` };
    fs.writeFileSync(file, JSON.stringify(report, null, 2) + "\n");
  } finally { obs.close(); }
}
