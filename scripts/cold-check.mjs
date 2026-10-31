import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { demoLibrary } from "../public/data.js";
const origin = process.env.TEST_URL || "http://localhost:8787";
const browser = await chromium.launch({ headless: true });
await fs.mkdir("docs/screenshots", { recursive: true });
try {
  for (const theme of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: width === 390 ? 844 : 1080 },
        colorScheme: theme,
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await page.goto(origin, { waitUntil: "networkidle" });
      await page.waitForFunction(() =>
        document.querySelector("#overlay-url").value.includes("room="),
      );
      assert.equal(
        await page.evaluate(() => localStorage.getItem("callback-theme")),
        null,
      );
      assert.equal(
        await page.locator("#channel-name").textContent(),
        `${demoLibrary.broadcaster.name}’s archive`,
      );
      assert.equal(
        await page.locator(".nav-count").textContent(),
        String(demoLibrary.clips.length),
      );
      if (!demoLibrary.clips.length)
        assert.equal(await page.locator("#play").isDisabled(), true);
      for (const view of ["studio", "library", "overlay", "guide"]) {
        if (width === 390) await page.locator("#menu").click();
        await page.locator(`[data-view="${view}"]`).click();
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          `${view} overflows ${width}/${theme}`,
        );
        await page.screenshot({
          mask: [page.locator("#overlay-url")],
          path: `docs/screenshots/${view}-${theme}-${width}.png`,
          fullPage: true,
          animations: "disabled",
        });
      }
      assert.deepEqual(errors, [], `${width}/${theme} console errors`);
      console.log(
        `PASS cold ${width}px ${theme}: all views, system theme, no credentials, no console errors or overflow`,
      );
      await page.request.post(origin + "/api/rotate-overlay", { headers: { Origin: new URL(origin).origin }, data: {} });
      await context.close();
    }
  }
} finally {
  await browser.close();
}
