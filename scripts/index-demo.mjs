import fs from "node:fs";
import { parseEnv } from "node:util";
import { normalizeClip } from "../src/clip-index.js";
import { buildScenarios } from "../public/replay.js";
import { writeTriggerPhrases } from "./write-trigger-phrases.mjs";

const args = process.argv.slice(2);
const login = args[args.indexOf("--channel") + 1]?.toLowerCase();
if (!args.includes("--channel") || !/^[a-z0-9_]{3,25}$/.test(login || ""))
  throw new Error(
    "Usage: npm run index:demo -- --channel YOUR_LOGIN --owned-content",
  );
if (!args.includes("--owned-content"))
  throw new Error(
    "Only publish clips you own. Pass --owned-content after confirming the content is yours.",
  );
const local = fs.existsSync(".env")
  ? parseEnv(fs.readFileSync(".env", "utf8"))
  : {};
const clientId = (
  process.env.TWITCH_CLIENT_ID ||
  local.TWITCH_CLIENT_ID ||
  ""
).trim();
const clientSecret = (
  process.env.TWITCH_CLIENT_SECRET ||
  local.TWITCH_CLIENT_SECRET ||
  ""
).trim();
if (!clientId || !clientSecret)
  throw new Error(
    "Set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET in your ignored .env file.",
  );
const auth = await fetch("https://id.twitch.tv/oauth2/token", {
  method: "POST",
  body: new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  }),
});
if (!auth.ok)
  throw new Error(`Twitch app authentication failed (HTTP ${auth.status}).`);
const token = (await auth.json()).access_token;
let blockedUntil = 0;
async function helix(path) {
  if (Date.now() < blockedUntil)
    throw new Error(
      `Twitch rate limit cooling down. Retry in ${Math.ceil((blockedUntil - Date.now()) / 1000)} seconds.`,
    );
  const response = await fetch("https://api.twitch.tv/helix/" + path, {
    headers: { "Client-Id": clientId, Authorization: "Bearer " + token },
  });
  if (response.status === 429) {
    blockedUntil = Math.max(
      Date.now() + 1000,
      Number(response.headers.get("Ratelimit-Reset")) * 1000 ||
        Date.now() + 60000,
    );
    throw new Error("Twitch rate limit reached. Retry after its reset window.");
  }
  if (!response.ok)
    throw new Error(
      `Twitch metadata request failed (HTTP ${response.status}).`,
    );
  if (response.headers.get("Ratelimit-Remaining") === "0")
    blockedUntil =
      Number(response.headers.get("Ratelimit-Reset")) * 1000 ||
      Date.now() + 60000;
  return response.json();
}
const broadcaster = (await helix("users?login=" + encodeURIComponent(login)))
  .data[0];
if (!broadcaster) throw new Error("The selected broadcaster was not found.");
const all = [];
let cursor;
for (let page = 0; page < 5; page++) {
  const result = await helix(
    `clips?broadcaster_id=${broadcaster.id}&first=100${cursor ? "&after=" + encodeURIComponent(cursor) : ""}`,
  );
  if (result.data.some((c) => c.broadcaster_id !== broadcaster.id))
    throw new Error("A foreign clip was returned. No files were updated.");
  all.push(...result.data);
  cursor = result.pagination?.cursor;
  if (!cursor) break;
}
if (!all.length && !args.includes("--publish-empty"))
  throw new Error(
    `No published clips found for ${login}. Publish your clips, then run this command again. No files were changed.`,
  );
const selected = [...new Map(all.map((c) => [c.id, c])).values()]
  .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
  .slice(0, 8);
const ids = [...new Set(selected.map((c) => c.game_id).filter(Boolean))];
const games = ids.length
  ? Object.fromEntries(
      (
        await helix(
          "games?" + ids.map((id) => "id=" + encodeURIComponent(id)).join("&"),
        )
      ).data.map((g) => [g.id, g.name]),
    )
  : {};
const library = {
  schemaVersion: 2,
  source: "Twitch Helix",
  indexedAt: new Date().toISOString(),
  ownedContent: true,
  status: selected.length ? "ready" : "awaiting-clips",
  broadcaster: {
    id: broadcaster.id,
    login,
    name: broadcaster.display_name,
    url: "https://www.twitch.tv/" + login,
  },
  clips: selected.map((clip) => ({
    ...normalizeClip(clip, games, broadcaster),
    ...(/^[a-zA-Z0-9_-]+$/.test(clip.id) &&
    fs.existsSync(`public/media/owned-${clip.id}.mp4`)
      ? { mediaUrl: `/media/owned-${clip.id}.mp4` }
      : {}),
  })),
};
const scenarios = buildScenarios(library);
fs.writeFileSync(
  "public/demo-library.js",
  "export const demoLibrary = " + JSON.stringify(library, null, 2) + ";\n",
);
writeTriggerPhrases(library);
console.log(
  `Indexed ${library.clips.length} owned-channel ${library.broadcaster.name} clips and prepared ${scenarios.length} replay scenarios. No credentials or tokens were written.`,
);
