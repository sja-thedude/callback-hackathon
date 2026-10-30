import { chromium } from "@playwright/test";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto(process.env.TEST_URL || "http://localhost:8787");
await page.locator('[data-speed="4"]').click();
await page.locator("#play").click();
await page.waitForFunction(() =>
  document.querySelector("#stat-callbacks").textContent.startsWith("1"),
);
await page.locator("#play").click();
await page.waitForTimeout(7000);
for (const frame of page.frames().slice(1)) {
  console.log("Embed:", frame.url());
  console.log(
    (
      await frame
        .locator("body")
        .innerText()
        .catch(() => "")
    ).slice(0, 1000),
  );
}
await page
  .locator("#stage")
  .screenshot({
    path: "docs/screenshots/clip-playback.png",
    animations: "disabled",
  });
await browser.close();
