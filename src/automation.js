import { moments } from "../public/moments.js";
export const automationScopes = [
  "clips:edit",
  "channel:manage:broadcast",
  "channel:manage:clips",
];
const json = (value, status = 200) =>
  Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
export async function automationAction(studio, path, body, url) {
  const data = studio.data;
  if (path === "/api/automation/pair" && !data.user) {
    const code = crypto.randomUUID();
    await studio.state.storage.put("automation-pair", {
      code,
      expires: Date.now() + 300000,
    });
    return json({ code, expiresIn: 300 });
  }
  if (!data.user)
    return json({ error: "Authorize the broadcaster account first." }, 401);
  const granted = data.auth?.scope || [];
  const missing = automationScopes.filter((scope) => !granted.includes(scope));
  if (path === "/api/automation/status")
    return json({
      user: data.user,
      grantedScopes: granted,
      missingScopes: missing,
      ready: missing.length === 0,
    });
  if (missing.length)
    return json(
      {
        error: "Reconnect with the broadcast automation permissions.",
        missingScopes: missing,
      },
      403,
    );
  if (path === "/api/automation/channel") {
    const [channel, streams] = await Promise.all([
      studio.helix("channels?broadcaster_id=" + data.user.id),
      studio.helix("streams?user_id=" + data.user.id),
    ]);
    return json({ channel: channel.data[0], live: streams.data.length > 0 });
  }
  if (path === "/api/automation/title") {
    const moment = moments.find((item) => item.id === body.moment);
    const title = body.restore
      ? data.originalBroadcastTitle
      : body.rehearsal
        ? "Callback — live owner rehearsal"
        : moment?.title;
    if (!title)
      return json(
        { error: "Choose one of the original broadcast moments." },
        400,
      );
    if (!data.originalBroadcastTitle) {
      const channel = await studio.helix(
        "channels?broadcaster_id=" + data.user.id,
      );
      data.originalBroadcastTitle = channel.data[0].title;
      await studio.save();
    }
    await studio.helix("channels?broadcaster_id=" + data.user.id, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    });
    return json({ ok: true, title });
  }
  if (path === "/api/automation/create-clip") {
    const moment = moments.find((item) => item.id === body.moment);
    if (!moment)
      return json({ error: "Choose an original broadcast moment." }, 400);
    if (Date.now() - (data.lastAutomatedClip || 0) < 30000)
      return json(
        { error: "Wait at least 30 seconds between clip requests." },
        429,
      );
    const created = await studio.helix(
      "clips?" +
        new URLSearchParams({
          broadcaster_id: data.user.id,
          title: moment.title,
          duration: "20",
        }),
      { method: "POST" },
    );
    data.lastAutomatedClip = Date.now();
    await studio.save();
    return json({ ...created, intendedTitle: moment.title });
  }
  if (path === "/api/automation/clip") {
    const id = body.id || url.searchParams.get("id");
    if (!/^[a-zA-Z0-9_-]{1,150}$/.test(id || ""))
      return json({ error: "Invalid clip ID." }, 400);
    const clip = (await studio.helix("clips?id=" + id)).data[0];
    if (!clip) return json({ pending: true });
    if (clip.broadcaster_id !== data.user.id)
      return json({ error: "Only your own clips are available." }, 403);
    return json({ clip });
  }
  if (path === "/api/automation/download") {
    if (!/^[a-zA-Z0-9_-]{1,150}$/.test(body.id || ""))
      return json({ error: "Invalid clip ID." }, 400);
    const clip = (await studio.helix("clips?id=" + body.id)).data[0];
    if (!clip || clip.broadcaster_id !== data.user.id)
      return json({ error: "Choose a clip from your own channel." }, 403);
    return json(
      await studio.helix(
        "clips/downloads?" +
          new URLSearchParams({
            broadcaster_id: data.user.id,
            editor_id: data.user.id,
            clip_id: body.id,
          }),
      ),
    );
  }
  if (path === "/api/automation/chat") {
    if (Date.now() - (studio.lastAutomationChat || 0) < 2000)
      return json(
        { error: "Wait two seconds between rehearsal messages." },
        429,
      );
    const moment = moments.find((item) => item.id === body.moment);
    const message = body.nearMiss
      ? "My laptop battery needs charging before tomorrow’s meeting."
      : moment
        ? `${moment.title}. ${moment.phrase}.`
        : null;
    if (!message) return json({ error: "Choose a rehearsal phrase." }, 400);
    studio.lastAutomationChat = Date.now();
    const result = await studio.helix("chat/messages", {
      method: "POST",
      body: JSON.stringify({
        broadcaster_id: data.user.id,
        sender_id: data.user.id,
        message,
      }),
    });
    return json({ sent: result.data?.[0]?.is_sent === true, message });
  }
  return json({ error: "Unknown broadcast automation action." }, 404);
}
