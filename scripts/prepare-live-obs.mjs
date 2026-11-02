import fs from "node:fs";
import { action, origin } from "./automation-client.mjs";
import { connectOBS } from "./obs-client.mjs";
const session = await action("/api/session");
if (session.user?.login !== "sjathedude") throw new Error("Use the authorized owner studio for native live verification.");
const obs = await connectOBS(JSON.parse(fs.readFileSync(process.env.OBS_ACCESS_FILE || "/tmp/callback-obs-access.json", "utf8")));
try {
  if ((await obs.call("GetStreamStatus")).outputActive || (await obs.call("GetRecordStatus")).outputActive)
    throw new Error("The verification OBS instance is busy; no scene changes were made.");
  const collection = "Callback Live QA", scene = "Authenticated live verification", source = "Callback authenticated live overlay";
  const collections = await obs.call("GetSceneCollectionList");
  if (!collections.sceneCollections.includes(collection)) await obs.call("CreateSceneCollection", { sceneCollectionName: collection });
  else await obs.call("SetCurrentSceneCollection", { sceneCollectionName: collection });
  const scenes = await obs.call("GetSceneList");
  if (!scenes.scenes.some((item) => item.sceneName === scene)) await obs.call("CreateScene", { sceneName: scene });
  await obs.call("SetCurrentProgramScene", { sceneName: scene });
  const url = origin + "/overlay?" + new URLSearchParams({ room: session.room, key: session.overlayKey, mode: "live", revision: Date.now().toString(36) });
  const inputs = (await obs.call("GetInputList")).inputs;
  const settings = { url, width: 1920, height: 1080, fps: 30, shutdown: false, restart_when_active: false, reroute_audio: true };
  if (!inputs.some((input) => input.inputName === source)) await obs.call("CreateInput", { sceneName: scene, inputName: source, inputKind: "browser_source", inputSettings: settings, sceneItemEnabled: true });
  else await obs.call("SetInputSettings", { inputName: source, inputSettings: settings });
  await obs.call("SetInputMute", { inputName: source, inputMuted: true });
  await obs.call("SetVideoSettings", { baseWidth: 1920, baseHeight: 1080, outputWidth: 1920, outputHeight: 1080, fpsNumerator: 30, fpsDenominator: 1 });
  let connected = false;
  for (let attempt = 0; attempt < 20; attempt++) {
    if ((await action("/api/status")).connections.overlay > 0) { connected = true; break; }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!connected) throw new Error("The native OBS source did not connect to the authorized studio.");
  fs.writeFileSync("/tmp/callback-live-obs.json", JSON.stringify({ source, scene, preparedAt: new Date().toISOString() }), { mode: 0o600 });
  fs.mkdirSync("docs/screenshots", { recursive: true });
  const shot = await obs.call("GetSourceScreenshot", { sourceName: source, imageFormat: "png", imageWidth: 1920, imageHeight: 1080 });
  fs.writeFileSync("docs/screenshots/obs-authenticated-idle.png", Buffer.from(shot.imageData.split(",")[1], "base64"));
  console.log("Actual OBS is connected to the authorized live studio at 1920×1080. No private URL or control credential was printed.");
} finally { obs.close(); }
