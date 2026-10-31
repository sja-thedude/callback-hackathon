import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { clips, scenarios } from "../public/data.js";
import { mkdir } from "node:fs/promises";
const url = process.env.TEST_URL || "http://localhost:8787";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  colorScheme: "light",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => {
  if (
    /https:\/\/(?:[\w-]+\.)*(?:twitch\.tv|twitchcdn\.net|jtvnw\.net)\//.test(
      e.stack || "",
    ) ||
    e.message ===
      "getLayoutMap() must be called from a top-level browsing context or allowed by the permission policy."
  ) {
    console.log("External player notice:", e.message);
    return;
  }
  errors.push(e.message);
});
await mkdir("docs/screenshots", { recursive: true });
try {
  await page.goto(url);
  await page.waitForFunction(() =>
    document.querySelector("#overlay-url").value.includes("room="),
  );
  await page.screenshot({
    mask: [page.locator("#overlay-url")],
    path: "docs/screenshots/studio-light.png",
    fullPage: true,
    animations: "disabled",
  });
  if (clips.length) {
    await page.locator('[data-speed="4"]').click();
    await page.locator("#play").click();
    await page.waitForFunction(
      () =>
        document.querySelector("#stat-callbacks").textContent.startsWith("1"),
      { timeout: 20000 },
    );
    assert.equal(await page.locator("#callback-card.airing").count(), 1);
    assert.ok(
      (await page.locator("#callback-card").innerText()).includes(
        clips[0].title,
      ),
    );
    console.log("PASS replay produces the intended owned callback");
    const overlayURL = await page.locator("#overlay-url").inputValue();
    const overlay = await context.newPage();
    await overlay.goto(overlayURL);
    await page.waitForTimeout(1500);
    await page.locator('[data-view="overlay"]').click();
    await page.locator("#test-overlay").click();
    await overlay.locator("#callback-card.airing").waitFor({ timeout: 10000 });
    assert.equal(await overlay.locator("iframe").count(), 1);
    assert.equal(
      await overlay
        .locator("body")
        .evaluate((el) => getComputedStyle(el).backgroundColor),
      "rgba(0, 0, 0, 0)",
    );
    await overlay.close();
    console.log("PASS owned callback reaches transparent overlay");
  } else {
    assert.equal(await page.locator("#play").isDisabled(), true);
    assert.match(
      await page.locator("#stage-play").innerText(),
      /being recorded/,
    );
    console.log(
      "PASS unpublished owner archive has no fictional fallback; replay readiness remains pending",
    );
  }
  await page.locator('[data-view="library"]').click();
  assert.equal(await page.locator(".clip-card").count(), clips.length);
  if (clips.length) {
    await page.locator("#library-search").fill(clips[0].title);
    assert.ok((await page.locator(".clip-card").count()) >= 1);
    await page.locator("#library-search").fill("does-not-exist-zz");
    assert.equal(await page.locator(".library-empty").count(), 1);
    await page.locator("#library-search").fill("");
    await page.locator("#category-filter").selectOption(clips[0].category);
    assert.ok((await page.locator(".clip-card").count()) >= 1);
    await page.locator("#category-filter").selectOption("");
  }
  await page.locator("#open-settings").click();
  await page.locator("#threshold").fill("85");
  await page.locator("#save-settings").click();
  await page.waitForFunction(
    () => !document.querySelector("#settings-dialog").open,
  );
  assert.match(await page.locator("#confidence-hint").textContent(), /85%/);
  await page.reload();
  await page.waitForFunction(() =>
    document.querySelector("#confidence-hint").textContent.includes("85%"),
  );
  console.log("PASS settings persist across refresh");
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (theme) => (document.documentElement.dataset.theme = theme),
      theme,
    );
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1100 });
      for (const view of ["studio", "library", "overlay", "guide"]) {
        if (width === 390) await page.locator("#menu").click();
        await page.locator(`[data-view="${view}"]`).click();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        );
        assert.equal(
          overflow,
          false,
          `${view} overflow at ${width} in ${theme}`,
        );
        if (view === "studio" || width === 390)
          await page.screenshot({
            mask: [page.locator("#overlay-url")],
            path: `docs/screenshots/${view}-${theme}-${width}.png`,
            fullPage: true,
            animations: "disabled",
          });
      }
    }
  }
  console.log("PASS every screen in light/dark at 1440px and 390px");
  await page.locator("#menu").click();
  await page.locator('[data-view="studio"]').click();
  for (const selector of [
    "#theme",
    "#menu",
    "#connect",
    "#open-settings",
    "#stage-play",
    "#play",
    "#reset",
    ".speed-control button",
  ]) {
    for (const control of await page.locator(selector).all()) {
      const box = await control.boundingBox();
      assert.ok(
        box.width >= 44 && box.height >= 44,
        `44px target: ${selector}`,
      );
    }
  }
  if (clips.length) {
    await page
      .locator("#scenario")
      .selectOption(String(Math.min(1, scenarios.length - 1)));
    await page.locator('[data-speed="4"]').click();
    await page.locator("#play").click();
    await page.locator("#callback-card.airing").waitFor({ timeout: 15000 });
    await page.waitForTimeout(650);
    const stageBox = await page.locator("#stage").boundingBox();
    const cardBox = await page.locator("#callback-card").boundingBox();
    assert.ok(
      cardBox.y >= stageBox.y &&
        cardBox.y + cardBox.height <= stageBox.y + stageBox.height,
      "Phone callback fits in the preview",
    );
    await page.locator("#stage").screenshot({
      path: "docs/screenshots/callback-phone.png",
      animations: "disabled",
    });
    console.log(
      "PASS phone callback stays in-frame and primary controls have 44px tap targets",
    );
  }
  await page.locator("#connect").click();
  const connectionConfig = await (
    await page.request.get(url + "/api/config")
  ).json();
  if (connectionConfig.twitchConfigured) {
    await page.locator('#connect-state a[href="/auth/twitch"]').waitFor();
    console.log("PASS configured Twitch offers account authorization");
  } else {
    await page.waitForFunction(() =>
      document
        .querySelector("#connect-state")
        .textContent.includes("credentials"),
    );
    assert.match(
      await page.locator("#connect-state").innerText(),
      /credentials/,
    );
    console.log("PASS unconfigured Twitch has actionable setup state");
  }
  await page.locator("#close-connect").click();
  const live = await context.newPage();
  await live.setViewportSize({ width: 390, height: 844 });
  await live.route("**/api/session", async (route) => {
    const response = await route.fetch();
    const session = await response.json();
    const clip = {
      id: "owner-memory",
      title: "Our shared memory",
      category: "Our game",
      date: "2026-10-01",
      views: 50,
      score: 0.88,
      reason: "Three viewers remembered this moment.",
      at: Date.now(),
    };
    await route.fulfill({
      response,
      json: {
        ...session,
        user: { id: "owner", name: "Owner", login: "owner" },
        clips: [clip],
        history: [clip],
        candidate: { ...clip, runnerUp: 0.2, matchedAt: Date.now() },
        pendingCallback: { id: clip.id, dueAt: Date.now() + 7000 },
      },
    });
  });
  await live.goto(url);
  await live.waitForFunction(() =>
    document.querySelector("#stat-callbacks").textContent.startsWith("1"),
  );
  await live.locator("#pending-callback").waitFor();
  assert.match(await live.locator("#pending-callback").innerText(), /Airs in/);
  await live.locator("#veto-candidate").click();
  await live.waitForFunction(() =>
    document.querySelector("#candidate").classList.contains("hidden"),
  );
  console.log(
    "PASS restored veto countdown and veto controls (mocked live candidate)",
  );
  await live.locator("#memory-trail summary").click();
  assert.match(
    await live.locator("#trail-list").innerText(),
    /Our shared memory/,
  );
  await live.locator("#menu").click();
  await live.locator('[data-view="library"]').click();
  assert.equal(await live.locator(".clip-card").count(), 1);
  assert.match(
    await live.locator(".clip-card").innerText(),
    /Our shared memory/,
  );
  console.log(
    "PASS live workspace restores its own library and history (mocked session)",
  );
  await live.close();
  assert.deepEqual(errors, []);
  console.log("PASS no application JavaScript errors");
} finally {
  await page.request.post(url + "/api/rotate-overlay", { headers: { Origin: new URL(url).origin }, data: {} }).catch(() => {});
  await browser.close();
}
