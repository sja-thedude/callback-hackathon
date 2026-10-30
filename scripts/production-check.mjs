import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { clips, scenarios } from "../public/data.js";
const origin =
  process.env.TEST_URL || "https://callback-hackathon.sja-affu765.workers.dev";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  acceptDownloads: true,
});
try {
  const page = await context.newPage();
  await page.goto(origin);
  await page.waitForFunction(() =>
    document.querySelector("#overlay-url").value.includes("room="),
  );
  for (let i = 0; i < scenarios.length; i++) {
    const response = await page.request.post(origin + "/api/demo/search", {
      headers: { Origin: origin },
      data: { scenario: i, index: scenarios[i].messages.length },
    });
    assert.equal(response.status(), 200);
    const match = await response.json();
    assert.equal(match.source, "neural");
    assert.equal(match.matches[0].id, clips[scenarios[i].clip].id);
    assert.ok(match.verdict.ok);
    assert.ok(match.margin >= 0.08);
  }
  console.log(
    "PASS real neural inference retrieves the intended clip in all four scenarios",
  );
  await page.locator('[data-view="overlay"]').click();
  const url = await page.locator("#overlay-url").inputValue();
  assert.equal(new URL(url).searchParams.get("mode"), "demo");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator("#download-obs").click(),
  ]);
  const file = await download.path();
  const collection = JSON.parse(await fs.readFile(file, "utf8"));
  const source = collection.sources.find((s) => s.id === "browser_source");
  assert.ok(source);
  assert.equal(source.settings.url, url);
  assert.equal(source.settings.width, 1920);
  assert.equal(source.settings.height, 1080);
  console.log(
    "PASS private OBS scene export contains the correct source and canvas",
  );
  const demo = await context.newPage();
  await demo.goto(url);
  const live = await context.newPage();
  const liveURL = new URL(url);
  liveURL.searchParams.set("mode", "live");
  await live.goto(liveURL.toString());
  await page.waitForFunction(async () => {
    const r = await fetch("/api/status");
    return (await r.json()).connections.overlay >= 2;
  });
  await page.locator("#test-overlay").click();
  await demo.locator("#callback-card.airing").waitFor();
  await page.waitForTimeout(1000);
  assert.equal(await live.locator("#callback-card.airing").count(), 0);
  assert.match(await page.locator("#obs-status").innerText(), /connected/);
  console.log(
    "PASS live overlays ignore demo broadcasts and source presence is real",
  );
  await demo.close();
  await live.close();
} finally {
  await browser.close();
}
