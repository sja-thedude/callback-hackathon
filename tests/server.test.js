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
      async setAlarm(at) {
        values.set("alarm", at);
      },
      async deleteAlarm() {
        values.delete("alarm");
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
      "X-Control-Key": "test-controller-credential",
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
  assert.ok(!text.includes("test-controller-credential"));
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

test("overlay information cannot authorize studio control, including after disconnect", async () => {
  const { room } = await studio();
  await room.fetch(req("/api/session"));
  const forged = req("/api/settings", { autoFire: true });
  forged.headers.set("X-Control-Key", room.data.overlayKey);
  assert.equal((await room.fetch(forged)).status, 403);
  const missing = req("/api/session");
  missing.headers.delete("X-Control-Key");
  assert.equal((await room.fetch(missing)).status, 403);
  assert.equal(room.data.settings.autoFire, false);
  await room.fetch(req("/api/disconnect", {}));
  assert.equal(room.data.controlKey, "test-controller-credential");
  assert.equal((await room.fetch(forged)).status, 403);
});

test("changing broadcaster clears the previous archive and revokes overlay access", async () => {
  const { room } = await studio();
  room.data.user = { id: "old", name: "Old" };
  room.data.clips = [{ id: "old-clip", broadcasterId: "old", vector: [1, 0] }];
  room.data.history = [{ id: "old-clip" }];
  room.data.seen = ["old-clip"];
  room.data.settings.autoFire = true;
  room.data.settings.chatBot = true;
  await room.saveClips();
  const key = room.data.overlayKey;
  await room.setBroadcaster({ id: "new", login: "new", display_name: "New" });
  assert.equal(room.data.clips.length, 0);
  assert.equal(room.data.history.length, 0);
  assert.equal(room.data.seen.length, 0);
  assert.notEqual(room.data.overlayKey, key);
  assert.equal(room.data.settings.autoFire, false);
  assert.equal(room.data.settings.chatBot, false);
});
test("re-authorizing the same broadcaster preserves the indexed archive", async () => {
  const { room } = await studio();
  room.data.user = { id: "owner", name: "Owner" };
  room.data.clips = [{ id: "owned", broadcasterId: "owner" }];
  await room.setBroadcaster({
    id: "owner",
    login: "owner",
    display_name: "Owner",
  });
  assert.equal(room.data.clips.length, 1);
});
test("final airing gate rejects unindexed and foreign clips and accepts an owned indexed clip", async () => {
  const { room } = await studio();
  room.data.user = { id: "owner", name: "Owner" };
  room.data.clips = [
    { id: "foreign", broadcasterId: "other" },
    { id: "owned", broadcasterId: "owner" },
  ];
  await assert.rejects(() => room.fire({ id: "foreign" }), /ownership/);
  await assert.rejects(() => room.fire({ id: "unindexed" }), /ownership/);
  assert.equal(room.data.history.length, 0);
  await room.fire({ id: "owned", title: "Our memory", score: 0.9 });
  assert.equal(room.data.history[0].id, "owned");
});

test("a previous broadcaster’s indexing job cannot install its archive after account switch", async () => {
  const { room } = await studio({
    AI: { run: async () => ({ data: [[1, 0]] }) },
  });
  room.data.user = { id: "old", name: "Old" };
  let calls = 0;
  room.helix = async () => {
    if (++calls === 1) {
      room.data.user = { id: "new", name: "New" };
      return {
        data: [
          {
            id: "old-clip",
            broadcaster_id: "old",
            title: "Old memory",
            game_id: "42",
          },
        ],
      };
    }
    return { data: [{ id: "42", name: "Game" }] };
  };
  await assert.rejects(() => room.indexClips(), /Broadcaster changed/);
  assert.equal(room.data.clips.length, 0);
});

async function queuedStudio() {
  const result = await studio();
  const { room } = result;
  room.data.user = { id: "owner", name: "Owner" };
  room.data.clips = [
    { id: "owned", broadcasterId: "owner", title: "Forest sunrise" },
  ];
  room.data.settings.autoFire = true;
  room.data.window = ["one", "two", "three"].map((user) => ({
    user,
    at: Date.now(),
  }));
  room.data.candidate = {
    ...room.data.clips[0],
    score: 0.9,
    runnerUp: 0.2,
    matchedAt: Date.now(),
  };
  await room.queueCallback(room.data.candidate);
  return result;
}
test("automatic callbacks persist a seven-second veto window and recheck safety at airtime", async () => {
  const { room, state } = await queuedStudio();
  assert.equal(room.data.history.length, 0);
  assert.ok(room.data.pendingCallback.dueAt - Date.now() > 6500);
  assert.equal(state.values.get("alarm"), room.data.pendingCallback.dueAt);
  const dueAt = room.data.pendingCallback.dueAt;
  await room.queueCallback(room.data.candidate);
  assert.equal(room.data.pendingCallback.dueAt, dueAt);
  await room.alarm();
  assert.equal(room.data.history.length, 0);
  room.data.pendingCallback.dueAt = Date.now() - 1;
  await room.alarm();
  assert.equal(room.data.history[0].id, "owned");
  assert.equal(room.data.pendingCallback, undefined);
});
test("veto and disabling automatic airing cancel queued callbacks", async () => {
  for (const action of ["veto", "settings", "pause"]) {
    const { room, state } = await queuedStudio();
    const r = await room.fetch(
      req(
        "/api/" + action,
        action === "veto" ? { id: "owned" } : { autoFire: false },
      ),
    );
    assert.equal(r.status, 200);
    await room.alarm();
    assert.equal(room.data.history.length, 0);
    assert.equal(room.data.pendingCallback, undefined);
    assert.equal(state.values.has("alarm"), false);
  }
});
test("delayed callbacks cannot air after confidence, voices, or freshness fail", async () => {
  for (const failure of [
    "confidence",
    "voices",
    "stale",
    "duplicate",
    "owner",
  ]) {
    const { room } = await queuedStudio();
    room.data.pendingCallback.dueAt = Date.now() - 1;
    if (failure === "confidence") room.data.settings.threshold = 0.95;
    if (failure === "voices") room.data.window = [];
    if (failure === "stale") room.data.candidate.matchedAt = Date.now() - 60000;
    if (failure === "duplicate") room.data.seen = ["owned"];
    if (failure === "owner")
      await room.setBroadcaster({
        id: "new",
        login: "new",
        display_name: "New",
      });
    await room.alarm();
    assert.equal(room.data.history.length, 0, failure);
  }
});
test("bot success requires Twitch is_sent and failed delivery preserves the overlay callback", async () => {
  for (const sent of [true, false]) {
    const { room } = await queuedStudio();
    const events = [];
    room.emit = (event) => events.push(event);
    room.data.settings.chatBot = true;
    room.helix = async () => ({ data: [{ is_sent: sent }] });
    await room.fire({
      ...room.data.candidate,
      date: "2026-10-31",
      url: "https://clips.twitch.tv/owned",
    });
    assert.equal(room.data.history.length, 1);
    assert.equal(room.data.botStatus.sent, sent);
    assert.equal(
      events.some((e) => e.type === "bot-sent"),
      sent,
    );
    assert.equal(
      events.some((e) => e.type === "error"),
      !sent,
    );
  }
});
