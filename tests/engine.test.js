import test from "node:test";
import assert from "node:assert/strict";
import { embed, cosine, rank, decision, parseIRC } from "../public/engine.js";
import { clips, scenarios } from "../public/data.js";
test("every replay retrieves the intended real clip", () => {
  for (const s of scenarios) {
    const ranked = rank(s.messages.slice(-5).join(" "), clips);
    assert.equal(ranked[0].id, clips[s.clip].id);
    assert.ok(decision(ranked[0], { runnerUp: ranked[1].score }).ok);
  }
});
test("unrelated chatter never clears confidence", () => {
  for (const query of [
    "hello everyone good morning",
    "what did you have for lunch",
    "my cat is sleeping on the sofa",
    "today was such a lovely day",
  ]) {
    const r = rank(query, clips);
    assert.equal(decision(r[0], { runnerUp: r[1].score }).ok, false);
  }
});
test("confidence, cooldown, ambiguity and deduplication cannot be bypassed manually", () => {
  const candidate = { id: "one", score: 0.9 };
  assert.equal(
    decision({ ...candidate, score: 0.5 }, { manual: true }).ok,
    false,
  );
  assert.equal(decision(candidate, { runnerUp: 0.87, manual: true }).ok, false);
  assert.equal(
    decision(candidate, { lastFire: 1000000, now: 1000001, manual: true }).ok,
    false,
  );
  assert.equal(decision(candidate, { seen: ["one"], manual: true }).ok, false);
  assert.equal(decision(candidate, { now: 1000000 }).ok, true);
});
test("semantically related terms share a vector", () => {
  assert.ok(
    cosine(embed("buggy glitch gameplay"), embed("broken janky bugs")) > 0.65,
  );
  assert.ok(
    cosine(embed("smoke grenade tactic"), embed("expensive dollars price")) <
      0.2,
  );
  assert.equal(cosine(embed(""), embed("")), 0);
});
test("IRC messages parse display names and reject protocol messages", () => {
  assert.deepEqual(
    {
      ...parseIRC(
        "@display-name=Jules :jules!jules@jules.tmi.twitch.tv PRIVMSG #lirik :remember the smoke tactic",
      ),
      at: 0,
    },
    { user: "Jules", text: "remember the smoke tactic", at: 0 },
  );
  assert.equal(parseIRC("PING :tmi.twitch.tv"), null);
});
test("each demo clip has a unique public link and valid date", () => {
  assert.equal(new Set(clips.map((c) => c.id)).size, clips.length);
  for (const c of clips) {
    assert.ok(
      ["clips.twitch.tv", "www.twitch.tv"].includes(new URL(c.url).hostname),
    );
    assert.ok(new URL(c.url).pathname.endsWith(c.id));
    assert.ok(Number.isFinite(Date.parse(c.date)));
    assert.equal(c.broadcaster, "LIRIK");
    assert.equal(c.broadcasterId, "23161357");
    assert.ok(c.thumbnail.startsWith("https://"));
    assert.ok(c.duration > 0);
  }
});
