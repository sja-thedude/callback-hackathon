import fs from "node:fs";
import { parseEnv } from "node:util";
import { clips as selection } from "../public/data.js";
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
  throw new Error(
    "Twitch app authentication failed (HTTP " + auth.status + ").",
  );
const token = (await auth.json()).access_token;
let blockedUntil = 0;
async function helix(path) {
  if (Date.now() < blockedUntil)
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(60000, blockedUntil - Date.now())),
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
      "Twitch metadata request failed (HTTP " + response.status + ").",
    );
  if (response.headers.get("Ratelimit-Remaining") === "0")
    blockedUntil = Number(response.headers.get("Ratelimit-Reset")) * 1000;
  return response.json();
}
const broadcaster = (await helix("users?login=lirik")).data[0];
if (!broadcaster)
  throw new Error("The credited demo broadcaster was not found.");
const data = (
  await helix(
    "clips?" + selection.map((c) => "id=" + encodeURIComponent(c.id)).join("&"),
  )
).data;
const byId = new Map(data.map((c) => [c.id, c]));
const missing = selection.filter((c) => !byId.has(c.id));
if (missing.length)
  throw new Error(
    `${missing.length} selected clips are unavailable. Keep the previous verified library until the selection is repaired.`,
  );
if (data.some((c) => c.broadcaster_id !== broadcaster.id))
  throw new Error(
    "A selected clip belongs to another broadcaster. No files were updated.",
  );
const ids = [...new Set(data.map((c) => c.game_id).filter(Boolean))];
const games = new Map(
  (await helix("games?" + ids.map((id) => "id=" + id).join("&"))).data.map(
    (g) => [g.id, g.name],
  ),
);
const library = {
  schemaVersion: 1,
  source: "Twitch Helix",
  indexedAt: new Date().toISOString(),
  broadcaster: {
    id: broadcaster.id,
    login: broadcaster.login,
    name: broadcaster.display_name,
    url: "https://www.twitch.tv/" + broadcaster.login,
  },
  clips: selection.map((selected) => {
    const c = byId.get(selected.id);
    return {
      id: c.id,
      title: c.title,
      category: games.get(c.game_id) || "Just Chatting",
      gameId: c.game_id,
      date: c.created_at,
      views: c.view_count,
      duration: c.duration,
      thumbnail: c.thumbnail_url,
      url: c.url,
      broadcaster: c.broadcaster_name,
      broadcasterId: c.broadcaster_id,
      creator: c.creator_name,
    };
  }),
};
fs.writeFileSync(
  "public/demo-library.js",
  "export const demoLibrary = " + JSON.stringify(library, null, 2) + ";\n",
);
console.log(
  `Indexed ${library.clips.length} API-verified ${library.broadcaster.name} clips. No credentials or tokens were written.`,
);
