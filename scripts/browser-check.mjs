import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const url = process.env.TEST_URL || "http://localhost:8787";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  colorScheme: "light",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await mkdir("docs/screenshots", { recursive: true });
try {
  await page.goto(url);
  await page.waitForFunction(() =>
    document.querySelector("#overlay-url").value.includes("room="),
  );
  await page.screenshot({
    path: "docs/screenshots/studio-light.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.locator('[data-speed="4"]').click();
  await page.locator("#play").click();
  await page.waitForFunction(
    () => document.querySelector("#stat-callbacks").textContent.startsWith("1"),
    { timeout: 20000 },
  );
  assert.equal(await page.locator("#callback-card.airing").count(), 1);
  assert.match(
    await page.locator("#callback-card").innerText(),
    /Gotham Knights/,
  );
  await page.screenshot({
    path: "docs/screenshots/callback-on-air.png",
    fullPage: true,
    animations: "disabled",
  });
  console.log("PASS replay produces the intended callback");
  const overlayURL = await page.locator("#overlay-url").inputValue();
  const overlay = await context.newPage();
  await overlay.goto(overlayURL);
  await overlay.waitForTimeout(1500);
  await page.locator('[data-view="overlay"]').click();
  await page.locator("#test-overlay").click();
  await overlay.locator("#callback-card.airing").waitFor({ timeout: 10000 });
  assert.equal(await overlay.locator("iframe").count(), 1);
  const background = await overlay
    .locator("body")
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  assert.equal(background, "rgba(0, 0, 0, 0)");
  console.log(
    "PASS OBS overlay receives a cross-tab callback and stays transparent",
  );
  await overlay.close();
  await page.locator('[data-view="library"]').click();
  assert.equal(await page.locator(".clip-card").count(), 6);
  await page.locator("#library-search").fill("smoke");
  assert.equal(await page.locator(".clip-card").count(), 1);
  assert.match(await page.locator(".clip-card").innerText(), /5Head/);
  await page.locator("#library-search").fill("does-not-exist");
  assert.equal(await page.locator(".library-empty").count(), 1);
  await page.locator("#library-search").fill("");
  await page.locator("#category-filter").selectOption("Starfield");
  assert.equal(await page.locator(".clip-card").count(), 1);
  await page.locator("#category-filter").selectOption("");
  console.log("PASS library search, category filtering and empty states");
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
            path: `docs/screenshots/${view}-${theme}-${width}.png`,
            fullPage: true,
            animations: "disabled",
          });
      }
    }
  }
  console.log("PASS every screen in light/dark at 1440px and 390px");
  await page.locator("#connect").click();
  await page.waitForFunction(() =>
    document
      .querySelector("#connect-state")
      .textContent.includes("credentials"),
  );
  assert.match(await page.locator("#connect-state").innerText(), /credentials/);
  await page.locator("#close-connect").click();
  console.log("PASS unconfigured Twitch has actionable setup state");
  assert.deepEqual(errors, []);
  console.log("PASS no application JavaScript errors");
} finally {
  await browser.close();
}
