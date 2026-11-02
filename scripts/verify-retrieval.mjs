import fs from "node:fs";
import assert from "node:assert/strict";
import { clips, scenarios, demoLibrary } from "../public/data.js";
const origin = process.env.TEST_URL || "https://callback-hackathon.sja-affu765.workers.dev";
assert.ok(clips.length > 0, "A real owner archive is required.");
const results = [];
for (let scenario = 0; scenario < scenarios.length; scenario++) {
  const response = await fetch(origin + "/api/demo/search", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ scenario, index: scenarios[scenario].messages.length }) });
  assert.equal(response.status, 200);
  const result = await response.json();
  const match = result.matches[0];
  assert.equal(result.source, "neural");
  assert.equal(match.id, clips[scenarios[scenario].clip].id);
  assert.ok(result.verdict.ok && result.margin >= 0.08);
  results.push({ id: match.id, title: match.title, similarity: match.score, separation: result.margin, verdict: result.verdict.reason, model: result.model });
  console.log(`PASS ${match.title}: similarity ${match.score.toFixed(3)}, separation ${result.margin.toFixed(3)}`);
}
fs.writeFileSync("docs/RETRIEVAL_VERIFICATION.json", JSON.stringify({ verifiedAt: new Date().toISOString(), channel: demoLibrary.broadcaster.login, visitorCredentials: false, source: "real deployed neural inference", results }, null, 2) + "\n");
