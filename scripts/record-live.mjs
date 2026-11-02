import fs from "node:fs";
import puppeteer from "puppeteer-core";
import { chromium } from "@playwright/test";
import { action, origin, loadSession } from "./automation-client.mjs";
import { clips } from "../public/data.js";
import { moments } from "../public/moments.js";
import { publishPage } from "./publish-page.mjs";
import { captureNativeOBS } from "./capture-native-obs.mjs";
if (clips.length < 3 || clips.some((clip) => !clip.mediaUrl))
  throw new Error(
    "At least three real indexed owner clips with prepared owned media are required for separate veto, opening, and closing takes.",
  );
const status = await action("/api/automation/status");
if (!status.ready)
  throw new Error("Authorize the private recording helper first.");
const session = loadSession();
const currentStudio = await action("/api/session");
const availableClips = clips.filter((clip) => !currentStudio.seen.includes(clip.id));
if (availableClips.length < 3) throw new Error("Three unused owned clips are needed for this take; previously vetoed or aired clips remain protected.");
const directory = "/tmp/callback-auto-recordings";
fs.mkdirSync(directory, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: chromium.executablePath(),
  headless: true,
  args: [
    "--disable-background-timer-throttling",
    "--autoplay-policy=no-user-gesture-required",
  ],
});
const cookie = session.cookie.slice(session.cookie.indexOf("=") + 1);
await browser.setCookie({
  name: "callback_session",
  value: cookie,
  domain: new URL(origin).hostname,
  path: "/",
  httpOnly: true,
  secure: true,
  sameSite: "Lax",
});
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const recordings = new Set();
let publisher;
async function record(target, filename) {
  await target.bringToFront();
  const recorder = await target.screencast({
    path: `${directory}/${filename}.webm`,
    format: "webm",
  });
  recordings.add(recorder);
  return {
    start: Date.now(),
    stop: async () => {
      await recorder.stop();
      recordings.delete(recorder);
    },
  };
}
async function pause() {
  await action("/api/pause", {});
  await wait(800);
}
async function listen() {
  if (await page.$eval("#listen", (el) => el.textContent.includes("Stop"))) return;
  publisher?.setPage(page);
  await page.bringToFront();
  await page.click("#listen");
  await page.waitForFunction(
    () =>
      document
        .querySelector("#replay-status")
        .textContent.includes("Listening to #"),
    { timeout: 25000 },
  );
}
async function say(clip) {
  const moment = moments.find((item) => item.title === clip.title);
  if (!moment)
    throw new Error(
      "A clip does not match the original moment plan. Review its real title first.",
    );
  for (let i = 0; i < 3; i++) {
    const result = await action("/api/automation/chat", { moment: moment.id });
    if (!result.sent)
      throw new Error("Twitch did not confirm the rehearsal chat message.");
    await wait(2200);
  }
}
const evidence = {
  channel: status.user.login,
  transport: "real EventSub",
  mode: "labeled owner rehearsal",
  checks: {},
  recordedAt: new Date().toISOString(),
};
try {
  await page.goto(origin, { waitUntil: "networkidle0" });
  await page.waitForSelector("#listen");
  await page.addStyleTag({
    content:
      "#overlay-url{color:transparent!important;text-shadow:none!important}",
  });
  await action("/api/settings", {
    threshold: 0.72,
    cooldown: 60,
    duration: 20,
    autoFire: false,
    chatBot: true,
    soloRehearsal: true,
  });
  await action("/api/automation/title", { rehearsal: true });
  publisher = await publishPage(page);
  let confirmedLive = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    publisher.check();
    if ((await action("/api/automation/channel")).live) {
      confirmedLive = true;
      break;
    }
    await wait(1000);
  }
  if (!confirmedLive)
    throw new Error(
      "Twitch did not confirm the product-recording broadcast live.",
    );
  evidence.checks.publicLiveBroadcast = true;
  const indexing = await record(page, "indexing");
  await page.click("#live-index");
  await page.waitForFunction(
    async () =>
      (await (await fetch("/api/status")).json()).indexedClips > 0 &&
      document.querySelector("#index-progress").classList.contains("hidden"),
    { timeout: 90000 },
  );
  await wait(4000);
  await indexing.stop();
  evidence.checks.liveIndex = true;
  console.log("Verified real owner indexing; recording held near miss.");
  await listen();
  const nearMiss = await record(page, "near-miss");
  await action("/api/automation/chat", { nearMiss: true });
  await page.waitForSelector("#candidate:not(.hidden)", { timeout: 20000 });
  const verdict = await page.$eval("#candidate", (el) => el.textContent);
  if (!verdict.includes("CONNECTION HELD"))
    throw new Error(
      "The near-miss was not held. Choose a genuinely unrelated phrase; do not record a false safety claim.",
    );
  await wait(6000);
  await nearMiss.stop();
  evidence.checks.nearMissHeld = true;
  console.log("Near miss held; recording veto window.");
  await pause();
  await action("/api/settings", { autoFire: true });
  await listen();
  const veto = await record(page, "veto");
  const vetoChat = say(availableClips[0]);
  await page.waitForSelector("#pending-callback:not([hidden])", {
    timeout: 20000,
  });
  await wait(1400);
  await page.click("#veto-candidate");
  await vetoChat;
  await wait(7000);
  const afterVeto = await action("/api/session");
  if (
    afterVeto.history.some((item) => item.id === availableClips[0].id) ||
    afterVeto.pendingCallback
  )
    throw new Error("Veto did not cancel the callback.");
  await veto.stop();
  evidence.checks.liveVeto = true;
  console.log("Veto confirmed; recording opening callback.");
  await pause();
  const overlayURL = new URL(await page.$eval("#overlay-url", (el) => el.value));
  overlayURL.searchParams.set("mode", "live");
  const overlay = await browser.newPage();
  await overlay.setViewport({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
  });
  await overlay.goto(overlayURL.toString(), { waitUntil: "networkidle0" });
  await overlay.addStyleTag({
    content:
      "body{background:radial-gradient(ellipse at 55% 30%,#425846,#1d2922)!important}#callback-card{left:320px!important;bottom:190px!important;width:1280px!important;max-width:none!important}.overlay-connection{display:none!important}",
  });
  publisher.setPage(overlay);
  await listen();
  const opening = await record(overlay, "opening");
  await say(availableClips[1]);
  await overlay.waitForSelector("#callback-card.airing", { timeout: 25000 });
  const openingIn = Math.max(0, (Date.now() - opening.start) / 1000 - 0.2);
  await wait(5000);
  await captureNativeOBS("on-air");
  await wait(19000);
  await captureNativeOBS("exit");
  await opening.stop();
  const afterOpening = await action("/api/session");
  if (
    afterOpening.history[0]?.id !== availableClips[1].id ||
    !afterOpening.botStatus?.sent ||
    afterOpening.botStatus.at < opening.start
  )
    throw new Error(
      "Live retrieval, overlay, or confirmed callback posting did not complete.",
    );
  evidence.checks.realOwnerChat = true;
  evidence.checks.liveRetrieval = true;
  evidence.checks.confirmedBotPosting = true;
  await page.waitForFunction(
    (title) =>
      [...document.querySelectorAll(".chat-line.bot")].some(
        (line) =>
          line.textContent.includes("↶ Callback:") &&
          line.textContent.includes(title),
      ),
    { timeout: 10000 },
    availableClips[1].title,
  );
  evidence.checks.callbackLinkReceivedByEventSub = true;
  evidence.checks.privateOverlayDelivery = true;
  console.log("Opening callback, native OBS, and actual chat receipt confirmed.");
  publisher.setPage(page);
  const liveStudio = await record(page, "live-studio");
  await wait(19000);
  await liveStudio.stop();
  await pause();
  publisher.setPage(page);
  await page.bringToFront();
  await page.click('[data-view="library"]');
  const problem = await record(page, "problem");
  await wait(21000);
  await problem.stop();
  await page.click('[data-view="studio"]');
  while (Date.now() - afterOpening.lastFire < 61000) await wait(1000);
  await listen();
  const closing = await record(overlay, "closing");
  publisher.setPage(overlay);
  await say(availableClips[2]);
  await overlay.waitForSelector("#callback-card.airing", { timeout: 25000 });
  const closingIn = Math.max(0, (Date.now() - closing.start) / 1000 - 0.2);
  await wait(27000);
  await closing.stop();
  evidence.checks.secondOwnedCallback =
    (await action("/api/session")).history[0]?.id === availableClips[2].id;
  evidence.broadcast = publisher.check();
  fs.writeFileSync(
    `${directory}/verification.json`,
    JSON.stringify(evidence, null, 2),
  );
  fs.writeFileSync(
    `${directory}/edit-points.json`,
    JSON.stringify(
      {
        opening: {
          file: `${directory}/opening.webm`,
          in: openingIn,
          duration: 20,
        },
        problem: { file: `${directory}/problem.webm`, in: 0, duration: 20 },
        closing: {
          file: `${directory}/closing.webm`,
          in: closingIn,
          duration: 25,
        },
        studioTakes: [
          "indexing.webm",
          "near-miss.webm",
          "veto.webm",
          "live-studio.webm",
        ],
        build: "Actual thread footage still required",
      },
      null,
      2,
    ),
  );
  console.log(
    "Recorded real owner-chat, indexing, held near miss, veto, bot delivery, and overlay takes at 1080p. Private fields are not shown.",
  );
} catch (error) {
  await page.screenshot({ path: `${directory}/failed-step.png` }).catch(() => {});
  console.error("Recording step failed:", error.message);
  throw error;
} finally {
  await publisher?.stop();
  await action("/api/automation/title", { restore: true }).catch(() => {});
  await action("/api/pause", {}).catch(() => {});
  await action("/api/settings", {
    autoFire: false,
    soloRehearsal: false,
    chatBot: false,
  }).catch(() => {});
  for (const recording of recordings) await recording.stop().catch(() => {});
  await browser.close();
}
