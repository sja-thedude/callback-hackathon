import { rank, decision, tokens } from "../public/engine.js";
import { retrieveDemo } from "./demo.js";
const json = (data, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
const cookie = (name, value, secure = true, maxAge = 2592000) =>
  `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
const readCookie = (r, n) =>
  r.headers
    .get("Cookie")
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(n + "="))
    ?.slice(n.length + 1);
function safeError(e) {
  return (
    e.publicMessage || "The connection paused. Please try again in a moment."
  );
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/api/health")
        return json({ ok: true, service: "callback", version: "1.0.0" });
      if (url.pathname === "/overlay" || url.pathname === "/overlay/") {
        return env.ASSETS.fetch(
          new Request(new URL("/overlay.html", url.origin), request),
        );
      }
      if (
        !url.pathname.startsWith("/api/") &&
        !url.pathname.startsWith("/auth/")
      )
        return env.ASSETS.fetch(request);
      if (
        (request.method !== "GET" ||
          request.headers.get("Upgrade") === "websocket") &&
        request.headers.get("Origin") !== url.origin
      )
        return json(
          { error: "This action must come from your Callback studio." },
          403,
        );
      if (url.pathname === "/api/config")
        return json({
          twitchConfigured: !!(
            env.TWITCH_CLIENT_ID && env.TWITCH_CLIENT_SECRET
          ),
          embedding: "@cf/baai/bge-small-en-v1.5",
        });
      if (url.pathname === "/api/demo/search")
        return retrieveDemo(request, env);
      const overlay = url.pathname === "/api/overlay";
      const sessionParts = (
        readCookie(request, "callback_session") || ""
      ).split(".");
      let controlKey = sessionParts[1];
      let id = overlay
        ? url.searchParams.get("room")
        : /^[a-f0-9-]{36}$/.test(controlKey || "")
          ? sessionParts[0]
          : null;
      let fresh = false;
      try {
        if (id) env.STUDIO.idFromString(id);
      } catch {
        id = null;
      }
      if (!id) {
        if (overlay)
          return json(
            {
              error:
                "This overlay link is invalid. Copy a fresh link from your studio.",
            },
            401,
          );
        id = env.STUDIO.newUniqueId().toString();
        controlKey = crypto.randomUUID();
        fresh = true;
      }
      const stub = env.STUDIO.get(env.STUDIO.idFromString(id));
      const headers = new Headers(request.headers);
      headers.set("X-Studio-ID", id);
      headers.set("X-Public-Origin", url.origin);
      headers.delete("X-Control-Key");
      if (!overlay) headers.set("X-Control-Key", controlKey);
      const response = await stub.fetch(new Request(request, { headers }));
      if (fresh && response.status !== 101) {
        const next = new Response(response.body, response);
        next.headers.append(
          "Set-Cookie",
          cookie(
            "callback_session",
            `${id}.${controlKey}`,
            url.protocol === "https:",
          ),
        );
        return next;
      }
      return response;
    } catch (e) {
      console.error("Request failed", e.message);
      return json({ error: safeError(e) }, 500);
    }
  },
};
export class Studio {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sockets = new Set();
    this.socketRoles = new Map();
    this.busy = false;
    this.lastIngest = 0;
    this.indexing = false;
    this.state.blockConcurrencyWhile(async () => {
      this.data = (await state.storage.get("data")) || {
        settings: {
          threshold: 0.72,
          cooldown: 180,
          autoFire: false,
          chatBot: false,
          duration: 20,
        },
        history: [],
        lastFire: 0,
        seen: [],
        overlayKey: crypto.randomUUID(),
        window: [],
        messages: 0,
      };
      const chunks = await state.storage.list({ prefix: "clips:" });
      this.data.clips = [...chunks.values()].flat();
    });
  }
  async save() {
    const { clips, ...data } = this.data;
    await this.state.storage.put("data", data);
  }
  async setBroadcaster(user) {
    if (this.data.user && this.data.user.id !== user.id) {
      this.data.clips = [];
      this.data.history = [];
      this.data.seen = [];
      this.data.window = [];
      this.data.messages = 0;
      this.data.lastFire = 0;
      delete this.data.candidate;
      this.data.settings.autoFire = false;
      this.data.settings.chatBot = false;
      this.data.overlayKey = crypto.randomUUID();
      await this.saveClips();
      for (const socket of this.sockets)
        socket.close(1000, "Broadcaster changed");
      this.sockets.clear();
      this.socketRoles.clear();
    }
    this.data.user = {
      id: user.id,
      login: user.login,
      name: user.display_name,
    };
    await this.save();
  }
  async saveClips() {
    const old = await this.state.storage.list({ prefix: "clips:" });
    if (old.size) await this.state.storage.delete([...old.keys()]);
    for (let i = 0; i < this.data.clips.length; i += 5)
      await this.state.storage.put(
        `clips:${String(i).padStart(4, "0")}`,
        this.data.clips.slice(i, i + 5),
      );
  }
  emit(event) {
    for (const socket of this.sockets) {
      try {
        socket.send(JSON.stringify(event));
      } catch {
        this.sockets.delete(socket);
      }
    }
  }
  async helix(path, options = {}, retry = true) {
    if (this.twitchBlockedUntil > Date.now()) {
      const e = new Error("Rate limit cooling down");
      e.publicMessage = `Twitch is busy. Try again in ${Math.ceil((this.twitchBlockedUntil - Date.now()) / 1000)} seconds.`;
      throw e;
    }
    await this.token();
    const response = await fetch(`https://api.twitch.tv/helix/${path}`, {
      ...options,
      headers: {
        "Client-Id": this.env.TWITCH_CLIENT_ID,
        Authorization: `Bearer ${this.data.auth.access_token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    if (response.status === 401 && retry) {
      await this.token(true);
      return this.helix(path, options, false);
    }
    if (response.status === 429) {
      const seconds = Math.max(
        1,
        Number(response.headers.get("Ratelimit-Reset")) -
          Math.floor(Date.now() / 1000) || 60,
      );
      this.twitchBlockedUntil = Date.now() + seconds * 1000;
      const e = new Error("Rate limited");
      e.publicMessage = `Twitch is busy. Try again in ${seconds} seconds.`;
      throw e;
    }
    if (response.headers.get("Ratelimit-Remaining") === "0")
      this.twitchBlockedUntil = Math.max(
        Date.now() + 1000,
        Number(response.headers.get("Ratelimit-Reset")) * 1000 ||
          Date.now() + 60000,
      );
    if (!response.ok) {
      const e = new Error(`Twitch ${response.status}`);
      e.publicMessage =
        "Twitch could not complete that request. Reconnect your account and try again.";
      throw e;
    }
    return response.json();
  }
  async token(force = false) {
    if (!this.data.auth) {
      const e = new Error("Not connected");
      e.publicMessage = "Connect your Twitch account first.";
      throw e;
    }
    if (!force && this.data.auth.expiresAt > Date.now() + 60000) return;
    const r = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: this.env.TWITCH_CLIENT_ID,
        client_secret: this.env.TWITCH_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: this.data.auth.refresh_token,
      }),
    });
    if (!r.ok) {
      delete this.data.auth;
      await this.save();
      const e = new Error("Session expired");
      e.publicMessage = "Your Twitch session expired. Please connect again.";
      throw e;
    }
    const a = await r.json();
    this.data.auth = { ...a, expiresAt: Date.now() + a.expires_in * 1000 };
    await this.save();
  }
  public() {
    return {
      user: this.data.user || null,
      settings: this.data.settings,
      clips: this.data.clips.map(({ vector, ...c }) => c),
      history: this.data.history,
      overlayKey: this.data.overlayKey,
      lastFire: this.data.lastFire,
      seen: this.data.seen,
      messages: this.data.messages,
      embedding: this.data.clips.length
        ? "Workers AI · BGE semantic vectors"
        : "Ready to index",
      indexing: this.indexing,
      connections: {
        studio: [...this.socketRoles.values()].filter((r) => r === "studio")
          .length,
        overlay: [...this.socketRoles.values()].filter((r) => r === "overlay")
          .length,
      },
    };
  }
  async fetch(request) {
    const url = new URL(request.url),
      path = url.pathname,
      origin = request.headers.get("X-Public-Origin");
    try {
      if (path === "/api/overlay") {
        if (url.searchParams.get("key") !== this.data.overlayKey)
          return json(
            {
              error:
                "Overlay access has expired. Copy a new link from your studio.",
            },
            401,
          );
        if (request.headers.get("Upgrade") !== "websocket")
          return json({ ok: true, settings: this.data.settings });
        return this.socket("overlay");
      }
      const controlKey = request.headers.get("X-Control-Key");
      if (!controlKey)
        return json(
          { error: "Open this action from your private studio." },
          403,
        );
      if (!this.data.controlKey) {
        this.data.controlKey = controlKey;
        await this.save();
      }
      if (controlKey !== this.data.controlKey)
        return json(
          {
            error:
              "This studio credential is invalid. Open your original studio.",
          },
          403,
        );
      if (path === "/api/socket") {
        if (request.headers.get("Upgrade") !== "websocket")
          return json({ error: "WebSocket required" }, 400);
        return this.socket();
      }
      if (path === "/api/session") {
        await this.save();
        return json({
          ...this.public(),
          room: request.headers.get("X-Studio-ID"),
        });
      }
      if (path === "/api/status")
        return json({
          connections: this.public().connections,
          indexing: this.indexing,
          connected: !!this.data.user,
          indexedClips: this.data.clips.length,
        });
      if (path === "/auth/twitch") {
        if (!this.env.TWITCH_CLIENT_ID || !this.env.TWITCH_CLIENT_SECRET)
          return Response.redirect(`${origin}/?notice=twitch-setup`, 302);
        const state = crypto.randomUUID();
        await this.state.storage.put("oauth", {
          state,
          expires: Date.now() + 600000,
        });
        const target = new URL("https://id.twitch.tv/oauth2/authorize");
        target.search = new URLSearchParams({
          client_id: this.env.TWITCH_CLIENT_ID,
          redirect_uri: `${origin}/auth/callback`,
          response_type: "code",
          scope: "user:read:chat user:write:chat",
          state,
        });
        return Response.redirect(target.toString(), 302);
      }
      if (path === "/auth/callback") {
        const stored = await this.state.storage.get("oauth");
        await this.state.storage.delete("oauth");
        if (
          !stored ||
          stored.state !== url.searchParams.get("state") ||
          stored.expires < Date.now()
        )
          return Response.redirect(`${origin}/?notice=auth-expired`, 302);
        if (url.searchParams.has("error"))
          return Response.redirect(`${origin}/?notice=auth-denied`, 302);
        const r = await fetch("https://id.twitch.tv/oauth2/token", {
          method: "POST",
          body: new URLSearchParams({
            client_id: this.env.TWITCH_CLIENT_ID,
            client_secret: this.env.TWITCH_CLIENT_SECRET,
            code: url.searchParams.get("code"),
            grant_type: "authorization_code",
            redirect_uri: `${origin}/auth/callback`,
          }),
        });
        if (!r.ok)
          return Response.redirect(`${origin}/?notice=auth-failed`, 302);
        const a = await r.json();
        this.data.auth = { ...a, expiresAt: Date.now() + a.expires_in * 1000 };
        const user = (await this.helix("users")).data[0];
        await this.setBroadcaster(user);
        return Response.redirect(`${origin}/?notice=connected`, 302);
      }
      if (request.method !== "POST")
        return json({ error: "That studio endpoint does not exist." }, 404);
      const raw = await request.text();
      if (raw.length > 20000)
        return json({ error: "This request is too large." }, 413);
      let body = {};
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        return json({ error: "Please send a valid studio request." }, 400);
      }
      if (path === "/api/settings") {
        for (const [k, min, max] of [
          ["threshold", 0.6, 0.95],
          ["cooldown", 60, 600],
          ["duration", 10, 45],
        ])
          if (typeof body[k] === "number" && Number.isFinite(body[k]))
            this.data.settings[k] = Math.min(max, Math.max(min, body[k]));
        for (const k of ["autoFire", "chatBot"])
          if (typeof body[k] === "boolean") this.data.settings[k] = body[k];
        await this.save();
        this.emit({ type: "settings", settings: this.data.settings });
        return json(this.data.settings);
      }
      if (path === "/api/disconnect") {
        if (this.data.auth) {
          await fetch("https://id.twitch.tv/oauth2/revoke", {
            method: "POST",
            body: new URLSearchParams({
              client_id: this.env.TWITCH_CLIENT_ID,
              token: this.data.auth.access_token,
            }),
          }).catch(() => {});
        }
        this.data = {
          controlKey: this.data.controlKey,
          settings: this.data.settings,
          clips: [],
          history: [],
          seen: [],
          lastFire: 0,
          overlayKey: crypto.randomUUID(),
          window: [],
          messages: 0,
        };
        await this.saveClips();
        await this.save();
        this.emit({ type: "disconnected" });
        for (const s of this.sockets) s.close(1000, "Disconnected");
        this.sockets.clear();
        return json({ ok: true });
      }
      if (path === "/api/rotate-overlay") {
        this.data.overlayKey = crypto.randomUUID();
        await this.save();
        for (const s of this.sockets) s.close(1000, "Overlay link rotated");
        this.sockets.clear();
        return json({ key: this.data.overlayKey });
      }
      if (path === "/api/index") {
        if (!this.data.user)
          return json(
            { error: "Connect your own channel before indexing." },
            401,
          );
        if (this.indexing)
          return json({ error: "Your library is already being indexed." }, 409);
        this.indexing = true;
        this.state.waitUntil(
          this.indexClips()
            .catch((e) => {
              this.emit({ type: "error", message: safeError(e) });
            })
            .finally(() => {
              this.indexing = false;
            }),
        );
        return json({ started: true });
      }
      if (path === "/api/eventsub") {
        if (!this.data.user)
          return json({ error: "Connect your channel first." }, 401);
        if (!/^[a-zA-Z0-9_=\-]{10,200}$/.test(body.sessionId || ""))
          return json({ error: "Invalid chat connection." }, 400);
        const result = await this.helix("eventsub/subscriptions", {
          method: "POST",
          body: JSON.stringify({
            type: "channel.chat.message",
            version: "1",
            condition: {
              broadcaster_user_id: this.data.user.id,
              user_id: this.data.user.id,
            },
            transport: { method: "websocket", session_id: body.sessionId },
          }),
        });
        return json({ connected: !!result.data?.length });
      }
      if (path === "/api/ingest") {
        if (!this.data.user || !this.data.clips.length)
          return json({ error: "Connect and index your channel first." }, 400);
        if (!Array.isArray(body.messages) || body.messages.length > 100)
          return json({ error: "Send a bounded chat window." }, 400);
        const batch = body.messages
          .filter((m) => typeof m.text === "string" && m.text.length <= 500)
          .map((m) => ({
            text: m.text,
            user: String(m.user || "viewer").slice(0, 50),
            at: Date.now(),
          }));
        this.data.messages += batch.length;
        this.data.window = [
          ...this.data.window.filter((m) => Date.now() - m.at < 30000),
          ...batch,
        ].slice(-50);
        if (this.busy || Date.now() - this.lastIngest < 5000)
          return json({ held: true });
        this.lastIngest = Date.now();
        this.busy = true;
        try {
          const distinct = new Set(this.data.window.map((m) => m.user));
          if (distinct.size < 3)
            return json({
              held: true,
              reason: "Waiting for three independent voices",
            });
          const query = this.data.window
            .map((m) => m.text)
            .join(" ")
            .slice(-6000);
          if (tokens(query).length < 6) return json({ held: true });
          const embedding = await this.env.AI.run(
            "@cf/baai/bge-small-en-v1.5",
            { text: [query] },
          );
          const ranked = rank(query, this.data.clips, embedding.data[0]);
          const candidate = ranked[0];
          if (!candidate) return json({ held: true });
          this.data.candidate = {
            ...candidate,
            runnerUp: ranked[1]?.score || 0,
            matchedAt: Date.now(),
          };
          const verdict = decision(candidate, {
            ...this.data.settings,
            lastFire: this.data.lastFire,
            seen: this.data.seen,
            runnerUp: ranked[1]?.score || 0,
          });
          this.emit({
            type: "candidate",
            candidate: {
              ...candidate,
              vector: undefined,
              runnerUp: ranked[1]?.score || 0,
            },
            matches: ranked.slice(0, 3).map(({ vector, ...clip }) => clip),
            verdict,
          });
          if (verdict.ok && this.data.settings.autoFire)
            await this.fire(candidate);
          await this.save();
          return json({
            candidate: { ...candidate, vector: undefined },
            verdict,
          });
        } finally {
          this.busy = false;
        }
      }
      if (path === "/api/fire") {
        if (this.data.candidate?.id !== body.id)
          return json(
            { error: "Wait for a current live match before airing it." },
            400,
          );
        if (Date.now() - this.data.candidate.matchedAt > 45000)
          return json(
            {
              error: "That connection has passed. Wait for a fresh live match.",
            },
            409,
          );
        const c = this.data.candidate;
        const verdict = decision(c, {
          ...this.data.settings,
          lastFire: this.data.lastFire,
          seen: this.data.seen,
          runnerUp: c.runnerUp,
          manual: true,
        });
        if (!verdict.ok) return json({ error: verdict.reason }, 409);
        await this.fire(c);
        return json({ ok: true });
      }
      if (path === "/api/veto") {
        if (this.data.candidate?.id === body.id) {
          this.data.seen.push(body.id);
          delete this.data.candidate;
          await this.save();
          this.emit({ type: "veto", id: body.id });
        }
        return json({ ok: true });
      }
      if (path === "/api/preview") {
        const clip = this.data.clips.find((c) => c.id === body.id);
        if (
          !this.data.user ||
          !clip ||
          clip.broadcasterId !== this.data.user.id
        )
          return json(
            { error: "Choose a clip from your own indexed library first." },
            400,
          );
        if (Date.now() - (this.lastPreview || 0) < 5000)
          return json(
            { error: "Give the overlay preview a moment before trying again." },
            429,
          );
        this.lastPreview = Date.now();
        const { vector, ...publicClip } = clip;
        this.emit({
          type: "callback",
          clip: {
            ...publicClip,
            reason: "Overlay test — selected in your studio.",
          },
          preview: true,
          duration: 12,
          at: Date.now(),
        });
        return json({ ok: true });
      }
      if (path === "/api/demo-broadcast") {
        const { clips } = await import("../public/data.js");
        const clip = clips.find((c) => c.id === body.id);
        if (!clip) return json({ error: "Unknown demo memory." }, 400);
        this.emit({
          type: "callback",
          clip: {
            ...clip,
            vector: undefined,
            reason: String(
              body.reason || "A moment from the scripted replay.",
            ).slice(0, 200),
          },
          demo: true,
          duration: this.data.settings.duration,
          at: Date.now(),
        });
        return json({ ok: true });
      }
      return json({ error: "That studio action does not exist." }, 404);
    } catch (e) {
      console.error("Studio action failed", path, e.message);
      return json({ error: safeError(e) }, 500);
    }
  }
  socket(role = "studio") {
    const pair = new WebSocketPair();
    pair[1].accept();
    this.sockets.add(pair[1]);
    this.socketRoles.set(pair[1], role);
    pair[1].send(JSON.stringify({ type: "ready" }));
    const remove = () => {
      this.sockets.delete(pair[1]);
      this.socketRoles.delete(pair[1]);
      this.emit({ type: "presence", connections: this.public().connections });
    };
    pair[1].addEventListener("close", remove);
    pair[1].addEventListener("error", remove);
    this.emit({ type: "presence", connections: this.public().connections });
    return new Response(null, { status: 101, webSocket: pair[0] });
  }
  async indexClips() {
    const ownerId = this.data.user.id,
      ownerName = this.data.user.name;
    const all = [];
    let cursor = "";
    for (let page = 0; page < 5; page++) {
      this.emit({
        type: "index-progress",
        step: "fetch",
        count: all.length,
        progress: page * 10,
        label: "Fetching your channel’s clips from Twitch…",
      });
      const r = await this.helix(
        `clips?broadcaster_id=${ownerId}&first=100${cursor ? "&after=" + encodeURIComponent(cursor) : ""}`,
      );
      all.push(...r.data.filter((c) => c.broadcaster_id === ownerId));
      cursor = r.pagination?.cursor;
      if (!cursor) break;
    }
    const gameIds = [...new Set(all.map((c) => c.game_id).filter(Boolean))],
      games = {};
    for (let i = 0; i < gameIds.length; i += 100) {
      const r = await this.helix(
        "games?" +
          gameIds
            .slice(i, i + 100)
            .map((id) => "id=" + id)
            .join("&"),
      );
      r.data.forEach((g) => (games[g.id] = g.name));
    }
    const indexed = [];
    for (let i = 0; i < all.length; i += 24) {
      this.emit({
        type: "index-progress",
        step: "embed",
        count: i,
        progress: 50 + Math.round((i / Math.max(1, all.length)) * 48),
        label: `Building semantic memories · ${i} of ${all.length}`,
      });
      const batch = all.slice(i, i + 24);
      const result = await this.env.AI.run("@cf/baai/bge-small-en-v1.5", {
        text: batch.map(
          (c) => `${c.title} ${games[c.game_id] || "Just Chatting"}`,
        ),
      });
      batch.forEach((c, j) =>
        indexed.push({
          id: c.id,
          title: c.title,
          category: games[c.game_id] || "Just Chatting",
          date: c.created_at,
          views: c.view_count,
          duration: c.duration,
          thumbnail: c.thumbnail_url,
          url: c.url,
          broadcaster: ownerName,
          broadcasterId: c.broadcaster_id,
          vector: result.data[j],
        }),
      );
    }
    if (this.data.user?.id !== ownerId) {
      const error = new Error("Broadcaster changed during indexing");
      error.publicMessage =
        "Your connected account changed. Start indexing again for the current channel.";
      throw error;
    }
    this.data.clips = indexed;
    await this.saveClips();
    await this.save();
    this.emit({
      type: "index-complete",
      count: indexed.length,
      clips: indexed.map(({ vector, ...c }) => c),
    });
  }
  async fire(candidate) {
    if (
      !this.data.user ||
      !this.data.clips.some(
        (clip) =>
          clip.id === candidate.id && clip.broadcasterId === this.data.user.id,
      )
    ) {
      const error = new Error("Clip ownership check failed");
      error.publicMessage =
        "This memory is not in your connected channel’s indexed library. Index your own clips again.";
      throw error;
    }
    const { vector, runnerUp, ...clip } = candidate;
    this.data.lastFire = Date.now();
    this.data.seen.push(clip.id);
    this.data.history.unshift({ ...clip, at: this.data.lastFire });
    this.data.history = this.data.history.slice(0, 40);
    await this.save();
    this.emit({
      type: "callback",
      clip,
      duration: this.data.settings.duration,
      at: this.data.lastFire,
    });
    if (this.data.settings.chatBot) {
      try {
        await this.helix("chat/messages", {
          method: "POST",
          body: JSON.stringify({
            broadcaster_id: this.data.user.id,
            sender_id: this.data.user.id,
            message: `↶ Callback: ${clip.title} (${clip.date.slice(0, 10)}) — ${clip.url}`,
          }),
        });
        this.emit({ type: "bot-sent", title: clip.title });
      } catch (e) {
        this.emit({
          type: "error",
          message:
            "The overlay aired. The chat message could not be delivered.",
        });
      }
    }
  }
}
