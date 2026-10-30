import test from "node:test";
import assert from "node:assert/strict";
import { retrieveDemo } from "../src/demo.js";
import { embed } from "../public/engine.js";
import { demoLibrary, clips } from "../public/data.js";
const request = (body) =>
  new Request("https://callback.example/api/demo/search", {
    method: "POST",
    body: JSON.stringify(body),
  });
test("demo index has verified ownership and real clip metadata", () => {
  assert.equal(demoLibrary.source, "Twitch Helix");
  assert.equal(demoLibrary.broadcaster.id, "23161357");
  for (const c of clips) {
    assert.equal(c.broadcasterId, demoLibrary.broadcaster.id);
    assert.ok(c.thumbnail.startsWith("https://"));
    assert.ok(c.duration > 0);
    assert.ok(c.creator);
  }
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
