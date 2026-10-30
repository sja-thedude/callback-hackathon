import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const out = "/tmp/callback-recording";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  colorScheme: "light",
  recordVideo: { dir: out, size: { width: 1440, height: 1000 } },
});
const page = await context.newPage();
await page.goto(
  process.env.TEST_URL || "https://callback-hackathon.sja-affu765.workers.dev",
);
await page.waitForSelector("#stage-play");
await page.waitForFunction(() =>
  document.querySelector("#overlay-url").value.includes("room="),
);
async function caption(step, headline, note = "") {
  await page.evaluate(
    ({ step, headline, note }) => {
      let el = document.querySelector("#video-caption");
      if (!el) {
        el = document.createElement("div");
        el.id = "video-caption";
        el.style.cssText =
          "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:1000;width:calc(100% - 100px);max-width:1100px;padding:18px 26px;border-radius:12px;background:#232b23f5;color:#f6f2e5;box-shadow:0 10px 50px #0003;font-family:system-ui;border:1px solid #ffffff26;pointer-events:none;";
        document.body.append(el);
      }
      const host = document.querySelector("dialog[open]") || document.body;
      if (el.parentElement !== host) host.append(el);
      el.replaceChildren();
      const label = document.createElement("div");
      label.textContent = step;
      label.style.cssText =
        "font-size:11px;letter-spacing:2px;color:#ec9d7b;margin-bottom:6px";
      const title = document.createElement("div");
      title.textContent = headline;
      title.style.cssText = "font-size:23px;line-height:1.35;font-weight:500";
      el.append(label, title);
      if (note) {
        const small = document.createElement("div");
        small.textContent = note;
        small.style.cssText =
          "font-size:13px;line-height:1.6;color:#c5cbbd;margin-top:6px";
        el.append(small);
      }
    },
    { step, headline, note },
  );
}
const pause = (ms) => page.waitForTimeout(ms);
await caption(
  "CALLBACK / THE IDEA",
  "Your stream has a memory.",
  "A live callback engine for the moments your community remembers.",
);
await pause(5500);
await caption(
  "01 / THE REPLAY",
  "No account. No setup. Watch a conversation find its history.",
  "This walkthrough uses clearly labeled scripted chat and real public LIRIK clip references.",
);
await page.locator("#stage-play").click();
await pause(6000);
await page.locator('[data-speed="2"]').click();
await page.locator("#stage").scrollIntoViewIfNeeded();
await caption(
  "02 / THE CONNECTION",
  "Chat starts to sound familiar. The archive listens.",
  "Weak or ambiguous matches are held. A distinctive match must clear the threshold.",
);
await page.waitForFunction(
  () => document.querySelector("#stat-callbacks").textContent.startsWith("1"),
  { timeout: 25000 },
);
await page.locator("#stage").scrollIntoViewIfNeeded();
await caption(
  "03 / THE CALLBACK",
  "The original moment returns — with its date and the connection.",
  "Clip playback is embedded from its original host. The forest backdrop is original illustration.",
);
await pause(8500);
await page.locator("#director-desk").scrollIntoViewIfNeeded();
await caption(
  "04 / EXPLAINABLE RETRIEVAL",
  "See the alternatives. See why this one earned airtime.",
  "Three neural candidates, the separation between them, and explicit safety gates.",
);
await pause(6500);
await page.locator("#memory-trail summary").click();
await page.locator("#memory-trail").scrollIntoViewIfNeeded();
await caption(
  "04 / THE EVIDENCE",
  "Every connection has a story. Keep the evidence.",
  "Inspect confidence, source, and the reason. Export the session for review.",
);
await pause(6000);
await page.locator('[data-view="library"]').click();
await page.locator("#library-search").fill("smoke");
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
await caption(
  "05 / THE MEMORY BANK",
  "Your archive, searchable by the moment you remember.",
  "Live mode indexes only the connected broadcaster’s own channel. The demo archive stays separate.",
);
await pause(6500);
await page.locator('[data-view="overlay"]').click();
await page.locator("#overlay-url").evaluate((el) => (el.type = "password"));
await page.locator("#test-overlay").click();
await caption(
  "06 / MADE FOR THE SCREEN",
  "One private browser source. A perfectly timed encore.",
  "A transparent OBS source receives the same callback over a private WebSocket.",
);
await pause(6500);
await page.locator("#open-settings").click();
await page.locator("#threshold").fill("85");
await caption(
  "07 / RESTRAINT IS THE FEATURE",
  "Confidence. Cooldown. Manual approval. A veto when you need it.",
  "Live callbacks require three voices, a clear match, and server-side safety checks.",
);
await pause(6500);
await page.locator("#settings-dialog .icon-button").click();
await page.locator('[data-view="studio"]').click();
await page.locator("#theme").click();
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
await caption(
  "08 / BUILT IN CODEX",
  "Built in one Codex thread, from the first branch to Cloudflare.",
  "Product, neural retrieval, backend, original visuals, 19 tests, real OBS verification, and deployment.",
);
await pause(6500);
await caption(
  "CALLBACK / TRY IT",
  "callback-hackathon.sja-affu765.workers.dev",
  "The app is configured. Live retrieval needs an authorized channel with saved clips. The replay is ready now.",
);
await pause(6500);
const video = page.video();
await context.close();
await browser.close();
console.log("Recorded replay walkthrough:", await video.path());
