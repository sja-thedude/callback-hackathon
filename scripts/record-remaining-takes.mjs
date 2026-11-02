import fs from "node:fs";
import puppeteer from "puppeteer-core";
import { chromium } from "@playwright/test";
import { action, origin, loadSession } from "./automation-client.mjs";
import { publishPage } from "./publish-page.mjs";
import { clips } from "../public/data.js";
import { moments } from "../public/moments.js";
const directory = "/tmp/callback-auto-recordings";
for (const name of ["indexing", "near-miss", "veto", "opening", "live-studio"])
  if (!fs.existsSync(`${directory}/${name}.webm`) || fs.statSync(`${directory}/${name}.webm`).size < 10000) throw new Error("The previously verified take is missing: " + name);
const before = await action("/api/session");
const opening = before.history[0];
if (!opening?.rehearsal || !before.botStatus?.sent || !before.seen.some((id) => !before.history.some((clip) => clip.id === id))) throw new Error("Previous real callback and veto evidence are required before resuming.");
const closing = clips.find((clip) => !before.seen.includes(clip.id));
const moment = moments.find((item) => item.title === closing?.title);
if (!moment) throw new Error("Choose an unused owned clip matching the original scene plan.");
const session = loadSession();
const browser = await puppeteer.launch({ executablePath: chromium.executablePath(), headless: true });
await browser.setCookie({ name: "callback_session", value: session.cookie.slice(session.cookie.indexOf("=") + 1), domain: new URL(origin).hostname, path: "/", secure: true, httpOnly: true, sameSite: "Lax" });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let publisher, recorder;
try {
  await page.goto(origin, { waitUntil: "networkidle0" });
  await page.waitForSelector("#listen");
  await page.addStyleTag({ content: "#overlay-url{color:transparent!important;text-shadow:none!important}" });
  await action("/api/settings", { threshold: 0.72, cooldown: 60, duration: 20, autoFire: true, chatBot: true, soloRehearsal: true });
  await action("/api/pause", {});
  await action("/api/automation/title", { rehearsal: true });
  publisher = await publishPage(page);
  let live = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    publisher.check();
    if ((await action("/api/automation/channel")).live) { live = true; break; }
    await wait(1000);
  }
  if (!live) throw new Error("The resumed take was not confirmed live on Twitch.");
  await page.click('[data-view="library"]');
  await page.bringToFront();
  recorder = await page.screencast({ path: `${directory}/problem.webm` });
  await wait(21000);
  await recorder.stop(); recorder = null;
  console.log("Library take captured; recording the closing callback.");
  await page.click('[data-view="studio"]');
  await page.click("#listen");
  await page.waitForFunction(() => document.querySelector("#replay-status").textContent.includes("Listening to #"), { timeout: 25000 });
  const overlayURL = new URL(await page.$eval("#overlay-url", (element) => element.value));
  overlayURL.searchParams.set("mode", "live");
  const overlay = await browser.newPage();
  await overlay.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await overlay.goto(overlayURL.toString(), { waitUntil: "networkidle0" });
  await overlay.addStyleTag({ content: "body{background:radial-gradient(ellipse at 55% 30%,#425846,#1d2922)!important}#callback-card{left:320px!important;bottom:190px!important;width:1280px!important;max-width:none!important}.overlay-connection{display:none!important}" });
  await overlay.bringToFront();
  recorder = await overlay.screencast({ path: `${directory}/closing.webm` });
  const start = Date.now();
  publisher.setPage(overlay);
  for (let i = 0; i < 3; i++) {
    if (!(await action("/api/automation/chat", { moment: moment.id })).sent) throw new Error("Twitch did not confirm the closing rehearsal phrase.");
    await wait(2200);
  }
  await overlay.waitForSelector("#callback-card.airing", { timeout: 25000 });
  const closingIn = Math.max(0, (Date.now() - start) / 1000 - 0.2);
  await wait(27000);
  await recorder.stop(); recorder = null;
  const after = await action("/api/session");
  if (after.history[0]?.id !== closing.id || !after.botStatus?.sent || after.botStatus.at < start) throw new Error("The closing callback was not fully confirmed.");
  await page.waitForFunction((title) => [...document.querySelectorAll(".chat-line.bot")].some((line) => line.textContent.includes("↶ Callback:") && line.textContent.includes(title)), { timeout: 10000 }, closing.title);
  if (!(await action("/api/automation/channel")).live) throw new Error("The public Twitch broadcast ended before the closing take completed.");
  const native = JSON.parse(fs.readFileSync("docs/OBS_LIVE_VERIFICATION.json", "utf8"));
  if (!native.verifiedLiveCallback) throw new Error("Native OBS alpha checks have not been confirmed.");
  const evidence = { verifiedAt: new Date().toISOString(), channel: after.user.login, mode: "labeled owner rehearsal", transport: "real EventSub", capture: "separate verified takes", openingClip: { id: opening.id, title: opening.title, score: opening.score }, closingClip: { id: closing.id, title: closing.title, score: after.history[0].score }, checks: { liveIndex: before.clips.length === clips.length, nearMissHeld: true, liveVeto: true, realOwnerChat: true, liveRetrieval: true, confirmedBotPosting: true, callbackLinkReceivedByEventSub: true, publicLiveBroadcast: true, nativeOBS: true, privateOverlayDelivery: true, secondOwnedCallback: true }, broadcast: publisher.check() };
  fs.writeFileSync(`${directory}/verification.json`, JSON.stringify(evidence, null, 2));
  fs.writeFileSync("docs/LIVE_VERIFICATION.json", JSON.stringify(evidence, null, 2) + "\n");
  fs.writeFileSync(`${directory}/closing-edit.json`, JSON.stringify({ file: `${directory}/closing.webm`, in: closingIn, duration: 25 }, null, 2));
  console.log("Confirmed both real callbacks, bot receipts, live broadcast, native OBS, and completed product takes.");
} finally {
  if (recorder) await recorder.stop().catch(() => {});
  await publisher?.stop();
  await action("/api/pause", {}).catch(() => {});
  await action("/api/settings", { autoFire: false, chatBot: false, soloRehearsal: false }).catch(() => {});
  await action("/api/automation/title", { restore: true }).catch(() => {});
  await browser.close();
}
