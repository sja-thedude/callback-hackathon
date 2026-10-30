import fs from "node:fs";
import { mkdir } from "node:fs/promises";
import { connectOBS } from "./obs-client.mjs";
const origin =
  process.env.TEST_URL || "https://callback-hackathon.sja-affu765.workers.dev";
const obs = await connectOBS(
  JSON.parse(
    fs.readFileSync(
      process.env.OBS_ACCESS_FILE || "/tmp/callback-obs-access.json",
      "utf8",
    ),
  ),
);
const scene = "Callback verification",
  background = "Callback verification backdrop",
  overlay = "Callback verification overlay";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await mkdir("docs/screenshots", { recursive: true });
await mkdir("/tmp/callback-obs-recordings", { recursive: true });
let recording = false;
try {
  const version = await obs.call("GetVersion");
  const special = await obs.call("GetSpecialInputs");
  for (const name of Object.values(special).filter(Boolean))
    await obs.call("SetInputMute", { inputName: name, inputMuted: true });
  const collections = await obs.call("GetSceneCollectionList");
  if (!collections.sceneCollections.includes("Callback QA"))
    await obs.call("CreateSceneCollection", {
      sceneCollectionName: "Callback QA",
    });
  else
    await obs.call("SetCurrentSceneCollection", {
      sceneCollectionName: "Callback QA",
    });
  const scenes = await obs.call("GetSceneList");
  if (!scenes.scenes.some((s) => s.sceneName === scene))
    await obs.call("CreateScene", { sceneName: scene });
  await obs.call("SetCurrentProgramScene", { sceneName: scene });
  const collectionAudio = await obs.call("GetSpecialInputs");
  for (const name of Object.values(collectionAudio).filter(Boolean))
    await obs.call("SetInputMute", { inputName: name, inputMuted: true });
  const before = await fetch(origin + "/api/session");
  const session = await before.json();
  const cookie = before.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error("A fresh private test studio was not created.");
  const url =
    origin +
    "/overlay?room=" +
    session.room +
    "&key=" +
    session.overlayKey +
    "&mode=demo";
  fs.writeFileSync(
    "/tmp/callback-obs-session.json",
    JSON.stringify({ cookie, room: session.room, url }),
    { mode: 0o600 },
  );
  const inputs = (await obs.call("GetInputList")).inputs;
  if (!inputs.some((i) => i.inputName === background))
    await obs.call("CreateInput", {
      sceneName: scene,
      inputName: background,
      inputKind: "color_source_v3",
      inputSettings: { color: 0xff244032, width: 1920, height: 1080 },
      sceneItemEnabled: true,
    });
  if (!inputs.some((i) => i.inputName === overlay))
    await obs.call("CreateInput", {
      sceneName: scene,
      inputName: overlay,
      inputKind: "browser_source",
      inputSettings: {
        url,
        width: 1920,
        height: 1080,
        fps: 30,
        shutdown: false,
        restart_when_active: false,
        reroute_audio: true,
      },
      sceneItemEnabled: true,
    });
  else
    await obs.call("SetInputSettings", {
      inputName: overlay,
      inputSettings: { url },
      overlay: true,
    });
  await obs.call("SetInputMute", { inputName: overlay, inputMuted: true });
  await obs.call("SetVideoSettings", {
    baseWidth: 1920,
    baseHeight: 1080,
    outputWidth: 1920,
    outputHeight: 1080,
    fpsNumerator: 30,
    fpsDenominator: 1,
  });
  await wait(6000);
  let overlayConnected = false;
  for (let attempt = 0; attempt < 15; attempt++) {
    const state = await (
      await fetch(origin + "/api/status", { headers: { Cookie: cookie } })
    ).json();
    if (state.connections?.overlay > 0) {
      overlayConnected = true;
      break;
    }
    await wait(1000);
  }
  if (!overlayConnected)
    throw new Error(
      "OBS browser source has not established its overlay connection.",
    );
  async function shot(name, sourceName) {
    const s = await obs.call("GetSourceScreenshot", {
      sourceName,
      imageFormat: "png",
      imageWidth: 1920,
      imageHeight: 1080,
    });
    fs.writeFileSync(name, Buffer.from(s.imageData.split(",")[1], "base64"));
  }
  await shot("docs/screenshots/obs-overlay-idle.png", overlay);
  await shot("docs/screenshots/obs-scene-idle.png", scene);
  const status = await obs.call("GetStreamStatus");
  if (status.outputActive)
    throw new Error(
      "A stream is already active; recording setup left unchanged.",
    );
  await obs.call("SetRecordDirectory", {
    recordDirectory: "/tmp/callback-obs-recordings",
  });
  await obs.call("StartRecord");
  recording = true;
  await wait(1800);
  const sent = await fetch(origin + "/api/demo-broadcast", {
    method: "POST",
    headers: {
      Cookie: cookie,
      Origin: origin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: "OptimisticEnjoyableSoybeanPrimeMe-N-TBy6nLpaWI59TF",
      reason:
        "OBS verification · a real LIRIK memory, delivered from the live Callback deployment.",
    }),
  });
  if (!sent.ok) throw new Error("Overlay test dispatch failed.");
  await wait(8500);
  await shot("docs/screenshots/obs-callback.png", scene);
  await shot("docs/screenshots/obs-overlay-on-air.png", overlay);
  await wait(14000);
  await shot("docs/screenshots/obs-overlay-exit.png", overlay);
  const record = await obs.call("StopRecord");
  recording = false;
  const report = {
    verifiedAt: new Date().toISOString(),
    obsVersion: version.obsVersion,
    obsWebSocketVersion: version.obsWebSocketVersion,
    canvas: { width: 1920, height: 1080, fps: 30 },
    sourceKind: "browser_source",
    deployment: origin,
    checks: {
      realOBS: true,
      authenticatedControl: true,
      privateOverlay: true,
      idleScreenshot: true,
      onAirScreenshot: true,
      exitScreenshot: true,
    },
    recordingFile: record.outputPath,
  };
  fs.writeFileSync(
    "/tmp/callback-obs-verification.json",
    JSON.stringify(report, null, 2),
  );
  console.log("Actual OBS recording:", record.outputPath);
  console.log(
    "OBS " +
      version.obsVersion +
      " browser-source verification captured at 1920×1080.",
  );
} catch (error) {
  if (recording) await obs.call("StopRecord").catch(() => {});
  throw error;
} finally {
  obs.close();
}
