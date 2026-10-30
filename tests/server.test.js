import test from "node:test";
import assert from "node:assert/strict";
import worker, { Studio } from "../src/worker.js";
function memoryState(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    values,
    ready: null,
    blockConcurrencyWhile(fn) {
      this.ready = fn();
    },
    waitUntil(p) {
      this.pending = p;
    },
    storage: {
      async get(k) {
        return values.get(k);
      },
      async put(k, v) {
        values.set(k, structuredClone(v));
      },
      async delete(keys) {
        for (const k of Array.isArray(keys) ? keys : [keys]) values.delete(k);
      },
      async list({ prefix }) {
        return new Map(
          [...values].filter(([k]) => k.startsWith(prefix)).sort(),
        );
      },
    },
  };
}
async function studio(env = {}, seed = {}) {
  const state = memoryState(seed),
    room = new Studio(state, env);
  await state.ready;
  return { room, state };
}
const req = (path, body) =>
  new Request("https://callback.example" + path, {
    method: body ? "POST" : "GET",
    headers: {
      "X-Public-Origin": "https://callback.example",
      "X-Studio-ID": "studio",
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
test("cross-origin actions and WebSockets are rejected before session access", async () => {
  const post = await worker.fetch(
    new Request("https://callback.example/api/settings", {
      method: "POST",
      headers: { Origin: "https://evil.example" },
    }),
    {},
  );
  assert.equal(post.status, 403);
  const ws = await worker.fetch(
    new Request("https://callback.example/api/socket", {
      headers: { Origin: "https://evil.example", Upgrade: "websocket" },
    }),
    {},
  );
  assert.equal(ws.status, 403);
});
test("public session never returns OAuth credentials or vectors", async () => {
  const { room } = await studio();
  room.data.auth = {
    access_token: "private-test-token",
    refresh_token: "private-test-refresh",
  };
  room.data.clips = [{ id: "owned", vector: [1, 2], title: "Memory" }];
  const r = await room.fetch(req("/api/session"));
  const text = await r.text();
  assert.ok(!text.includes("private-test"));
  assert.equal(JSON.parse(text).clips[0].vector, undefined);
});
test("settings enforce confidence, cooldown and screen-time bounds", async () => {
  const { room } = await studio();
  const r = await room.fetch(
    req("/api/settings", {
      threshold: 0,
      cooldown: 0,
      duration: 999,
      autoFire: true,
    }),
  );
  const s = await r.json();
  assert.equal(s.threshold, 0.6);
  assert.equal(s.cooldown, 60);
  assert.equal(s.duration, 45);
  assert.equal(s.autoFire, true);
});
test("wrong overlay key and unauthenticated indexing are rejected", async () => {
  const { room } = await studio();
  assert.equal((await room.fetch(req("/api/overlay?key=bad"))).status, 401);
  assert.equal((await room.fetch(req("/api/index", {}))).status, 401);
});
test("clip vectors survive storage in bounded records", async () => {
  const { room, state } = await studio();
  room.data.clips = Array.from({ length: 30 }, (_, i) => ({
    id: String(i),
    vector: Array(384).fill(0.001),
  }));
  await room.saveClips();
  await room.save();
  assert.equal(state.values.get("data").clips, undefined);
  assert.equal(
    [...state.values.keys()].filter((k) => k.startsWith("clips:")).length,
    6,
  );
  const next = new Studio(state, {});
  await state.ready;
  assert.equal(next.data.clips.length, 30);
});
test("Twitch 429 blocks repeated requests until the reset window", async () => {
  const { room } = await studio({ TWITCH_CLIENT_ID: "test-id" });
  room.data.auth = { access_token: "test", expiresAt: Date.now() + 3600000 };
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response("{}", {
      status: 429,
      headers: {
        "Ratelimit-Reset": String(Math.floor(Date.now() / 1000) + 60),
      },
    });
  };
  try {
    await assert.rejects(() => room.helix("clips"), /Rate limited/);
    await assert.rejects(() => room.helix("clips"), /cooling down/);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
  }
});
test("index excludes clips belonging to another broadcaster", async () => {
  const { room } = await studio({
    AI: { run: async () => ({ data: [[1, 0]] }) },
  });
  room.data.user = { id: "owner", name: "Owner" };
  let request = 0;
  room.helix = async () =>
    ++request === 1
      ? {
          data: [
            {
              id: "own",
              broadcaster_id: "owner",
              title: "Our memory",
              game_id: "42",
              created_at: "2026-01-01",
              view_count: 3,
              duration: 20,
              url: "https://clips.twitch.tv/own",
            },
            {
              id: "foreign",
              broadcaster_id: "other",
              title: "Someone else",
              game_id: "42",
            },
          ],
        }
      : { data: [{ id: "42", name: "Game" }] };
  await room.indexClips();
  assert.equal(room.data.clips.length, 1);
  assert.equal(room.data.clips[0].id, "own");
});
test("manual fire rejects stale candidates", async () => {
  const { room } = await studio();
  room.data.candidate = {
    id: "old",
    score: 0.99,
    runnerUp: 0.1,
    matchedAt: Date.now() - 60000,
  };
  const response = await room.fetch(req("/api/fire", { id: "old" }));
  assert.equal(response.status, 409);
  assert.equal(room.data.history.length, 0);
});
