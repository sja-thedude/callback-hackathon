import fs from "node:fs";
import { origin, saveSession, action } from "./automation-client.mjs";
const response = await fetch(origin + "/api/session");
const studio = await response.json();
const cookie = response.headers.get("set-cookie")?.split(";")[0];
if (!response.ok || !cookie)
  throw new Error("A new private helper studio could not be created.");
const session = { cookie, room: studio.room, origin };
saveSession(session);
const pair = await action("/api/automation/pair", {}, session);
const destination =
  origin +
  "/auth/automation?" +
  new URLSearchParams({ room: studio.room, code: pair.code });
const file = "/tmp/callback-authorize-automation.html";
fs.writeFileSync(
  file,
  `<!doctype html><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Authorize your private Callback helper</title><style>body{font:20px/1.7 system-ui;background:#20261f;color:#f5f1e7;max-width:650px;margin:15vh auto;padding:24px}a{display:inline-block;padding:14px 22px;background:#ed9575;color:#20261f;border-radius:12px}</style><h1>Connect your own channel.</h1><p>This one-time link authorizes clip creation, title updates, owned clip downloads, and chat for your private local recording helper. Tokens stay on the server.</p><a href="${destination.replaceAll("&", "&amp;")}">Authorize the recording helper</a><p>This link expires in five minutes. Keep this file private.</p>`,
  { mode: 0o600 },
);
fs.chmodSync(file, 0o600);
console.log(
  "Open /tmp/callback-authorize-automation.html and authorize sjathedude. The private controller is saved outside the repository; no OAuth token is exported.",
);
