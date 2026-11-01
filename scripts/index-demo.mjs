import fs from "node:fs";
import { parseEnv } from "node:util";
import { normalizeClip } from "../src/clip-index.js";
import { buildScenarios } from "../public/replay.js";

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
const phrases = [
  "# Live trigger phrases",
  "",
  `Channel **${library.broadcaster.name}** verified through Twitch Helix on ${library.indexedAt}. ${library.clips.length} published clips indexed.`,
  "",
  ...(!library.clips.length
    ? [
        "**No owned clips have been published yet. Exact trigger phrases are pending the real index.**",
        "",
      ]
    : []),
  "Use three real chatters in the channel within 30 seconds. Each person sends their assigned line once, a few seconds apart. Keep the studio listening and wait up to 15 seconds for a candidate. These are metadata-based trigger suggestions; the deployed neural check must confirm them before filming. Do not use multiple browser tabs of the same account as independent voices.",
  "",
  ...library.clips.flatMap((clip, i) => [
    `## ${i + 1}. ${clip.title}`,
    "",
    `[Original clip](${clip.url})`,
    "",
    `- Chatter 1: ${clip.title}`,
    `- Chatter 2: I remember ${clip.title}`,
    `- Chatter 3: Bring back the ${clip.title} clip`,
    "",
  ]),
  "## Near-miss take",
  "",
  "After at least 35 seconds of unrelated conversation, have the three chatters discuss an unrelated topic, such as planning a train journey. Check that the candidate is held below threshold or for ambiguity; do not claim a held match unless the real verdict shows it. A separate safe test is to raise sensitivity to 95% and observe the actual verdict, clearly showing the setting.",
  "",
  "Automatic callbacks have a seven-second veto window. A vetoed or aired clip cannot air again in that studio session. Use a different indexed clip for the next take and respect the cooldown; do not weaken the gates to force a recording.",
  "",
].join("\n");
fs.writeFileSync(
  "public/demo-library.js",
  "export const demoLibrary = " + JSON.stringify(library, null, 2) + ";\n",
);
fs.writeFileSync("docs/TRIGGER_PHRASES.md", phrases);
console.log(
  `Indexed ${library.clips.length} owned-channel ${library.broadcaster.name} clips and prepared ${scenarios.length} replay scenarios. No credentials or tokens were written.`,
);
