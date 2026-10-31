import test from "node:test";
import assert from "node:assert/strict";
import { createDemoRetriever } from "../src/demo.js";
import { embed } from "../public/engine.js";
import { demoLibrary } from "../public/data.js";
import { library, clips, scenarios } from "./fixtures.js";
const retrieveDemo = createDemoRetriever({
  library,
  archive: clips,
  replay: scenarios,
});
const request = (body) =>
  new Request("https://callback.example/api/demo/search", {
    method: "POST",
    body: JSON.stringify(body),
  });
test("demo index has verified ownership and real clip metadata", () => {
  assert.equal(demoLibrary.source, "Twitch Helix");
  assert.equal(demoLibrary.ownedContent, true);
  assert.equal(demoLibrary.broadcaster.login, "sjathedude");
  assert.equal(demoLibrary.broadcaster.id, "1599601409");
  for (const c of demoLibrary.clips) {
    assert.equal(c.broadcasterId, demoLibrary.broadcaster.id);
    assert.ok(c.thumbnail.startsWith("https://"));
    assert.ok(c.duration > 0);
    assert.ok(c.creator);
  }
});
test("an unpublished owner archive cannot silently fall back to foreign or fictional clips", async () => {
  const empty = createDemoRetriever({ library, archive: [], replay: [] });
  assert.equal(
    (await empty(request({ scenario: 0, index: 3 }), {})).status,
    503,
  );
});
test("public retrieval rejects a foreign clip even if its metadata was accidentally installed", async () => {
  const foreign = createDemoRetriever({
    library,
    archive: [{ ...clips[0], broadcasterId: "other" }],
    replay: scenarios,
  });
  assert.equal(
    (await foreign(request({ scenario: 0, index: 3 }), {})).status,
    503,
  );
});
test("neural demo rejects arbitrary or malformed query windows before inference", async () => {
  for (const payload of [
    null,
    [],
    { scenario: 88, index: 3 },
    { scenario: 0, index: 900 },
    { scenario: 0, index: 1 },
  ])
    assert.equal((await retrieveDemo(request(payload), {})).status, 400);
});
test("neural demo enforces the inference budget", async () => {
  const r = await retrieveDemo(request({ scenario: 0, index: 3 }), {
    DEMO_LIMITER: { limit: async () => ({ success: false }) },
  });
  assert.equal(r.status, 429);
});
test("neural demo ranks the selected archive and does not return vectors", async () => {
  let calls = 0;
  const r = await retrieveDemo(request({ scenario: 0, index: 9 }), {
    AI: {
      run: async (model, { text }) => {
        calls++;
        assert.equal(model, "@cf/baai/bge-small-en-v1.5");
        return { data: text.map(embed) };
      },
    },
  });
  assert.equal(r.status, 200);
  const result = await r.json();
  assert.equal(result.matches[0].id, clips[0].id);
  assert.equal(result.source, "neural");
  assert.equal(result.matches.length, 3);
  assert.ok(result.margin > 0.08);
  assert.equal(result.matches[0].vector, undefined);
  assert.equal(calls, 2);
});
