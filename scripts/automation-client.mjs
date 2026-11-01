import fs from "node:fs";
const file =
  process.env.CALLBACK_AUTOMATION_SESSION ||
  "/tmp/callback-automation-session.json";
export const origin =
  process.env.TEST_URL || "https://callback-hackathon.sja-affu765.workers.dev";
export function saveSession(session) {
  fs.writeFileSync(file, JSON.stringify(session), { mode: 0o600 });
  fs.chmodSync(file, 0o600);
}
export function loadSession() {
  if (!fs.existsSync(file))
    throw new Error(
      "Run npm run automation:connect first and authorize the one-time helper link.",
    );
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
export async function action(path, body, session = loadSession()) {
  const response = await fetch(origin + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Cookie: session.cookie,
      Origin: origin,
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.error || `Automation request failed (HTTP ${response.status}).`,
    );
  return result;
}
