import { clips as demoClips, scenarios, names, demoLibrary } from "./data.js";
import { rank, decision } from "./engine.js";
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const paths = {
  monitor: "M3 4h18v12H3z M8 21h8 M12 16v5",
  expand: "M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5",
  sliders: "M4 7h5 M13 7h7 M4 17h9 M17 17h3 M9 4v6 M13 14v6",
  spark:
    "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z M20 2v4 M18 4h4",
  play: "m9 5 10 7-10 7z",
  pause: "M8 5v14 M16 5v14",
  reset: "M4 9a8 8 0 1 1 1 9 M4 3v6h6",
  chat: "M4 4h16v12H9l-5 4z M8 8h8 M8 12h5",
  volume: "m10 5-5 4H2v6h3l5 4z M15 9l6 6 M21 9l-6 6",
  layers: "m12 3 10 5-10 5L2 8z M2 12l10 5 10-5 M2 16l10 5 10-5",
  shield: "m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z m-4 9 3 3 5-6",
  search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  copy: "M9 8h11v13H9z M15 4V2H3v14h2",
  moon: "M20 15a8 8 0 0 1-11-11A9 9 0 1 0 20 15",
  sun: "M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1 1 M18 18l1 1 M5 19l1-1 M18 6l1-1 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  check: "m5 12 4 4L19 6",
  link: "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2 M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2",
};
const icon = (n) =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[n] || paths.spark}"/></svg>`;
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const date = (s) =>
  new Date(s).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const time = (n) =>
  `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
const num = (n) =>
  Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
const stored = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const persist = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};
async function api(path, body) {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "The connection paused. Please try again.");
  return data;
}
let toastTimer;
function toast(message, error = false) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = message;
  el.classList.toggle("error", error);
  el.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("visible"), 5000);
}
function artwork(c) {
  return c.thumbnail || "/assets/memory.svg";
}
let airTimer;
function callbackMarkup(c, { demo = true, auto = false } = {}) {
  const embed = `https://clips.twitch.tv/embed?clip=${encodeURIComponent(c.id)}&parent=${encodeURIComponent(location.hostname)}&autoplay=true&muted=true`;
  return `<div class="callback-top"><span class="callback-badge"><span>↶</span> A MOMENT RETURNS</span><span class="callback-date">${date(c.date)}</span></div><div class="callback-image"><img src="${esc(artwork(c))}" alt="${c.thumbnail ? "Original clip thumbnail" : "Original memory illustration; not gameplay"}">${auto ? `<iframe data-clip-src="${embed}" style="visibility:hidden" title="${esc(c.title)} — original clip" allow="autoplay; fullscreen" allowfullscreen></iframe>` : `<button class="callback-play" data-playclip="${esc(c.id)}" aria-label="Play original clip">${icon("play")}</button><span class="callback-art-label">${c.thumbnail ? "Original clip" : "Original illustration · play the original clip ↗"}</span>`}</div><div class="callback-detail"><h3>${esc(c.title)}</h3><p>${esc(c.reason || "Chat remembered. Your archive answered.")}</p><a href="https://clips.twitch.tv/${encodeURIComponent(c.id)}" target="_blank" rel="noreferrer">${demo ? "Demo archive · " : ""}${esc(c.broadcaster || "Your channel")} · Watch original ↗</a></div><div class="callback-timer"></div>`;
}
function showCard(element, c, options = {}) {
  element.className = "callback-card";
  element.innerHTML = callbackMarkup(c, options);
  element.style.setProperty("--airtime", `${options.duration || 20}s`);
  void element.offsetWidth;
  element.classList.add("airing");
  const frame = element.querySelector("iframe[data-clip-src]");
  if (frame)
    setTimeout(
      () => {
        if (!frame.isConnected || !element.classList.contains("airing")) return;
        frame.style.visibility = "visible";
        frame.src = frame.dataset.clipSrc;
      },
      matchMedia("(prefers-reduced-motion:reduce)").matches ? 0 : 650,
    );
  element
    .querySelector("[data-playclip]")
    ?.addEventListener("click", () => playOriginal(c));
}
function playOriginal(c) {
  const dialog = document.createElement("dialog");
  dialog.className = "clip-dialog";
  dialog.style.maxWidth = "860px";
  dialog.style.width = "calc(100% - 24px)";
  dialog.innerHTML = `<div class="panel-heading"><strong style="font-size:12px">${esc(c.title)}</strong><button class="icon-button" aria-label="Close clip" style="font-size:24px">×</button></div><iframe src="https://clips.twitch.tv/embed?clip=${encodeURIComponent(c.id)}&parent=${encodeURIComponent(location.hostname)}&autoplay=true&muted=false" style="width:100%;height:min(60vh,480px);min-height:300px;border:0" title="${esc(c.title)}" allow="autoplay; fullscreen" allowfullscreen></iframe><div style="padding:12px 18px;font-size:11px;color:var(--muted)">If playback is blocked by your browser, <a href="https://clips.twitch.tv/${encodeURIComponent(c.id)}" target="_blank" rel="noreferrer" style="color:var(--accent)">watch the original clip ↗</a></div>`;
  document.body.append(dialog);
  dialog.querySelector("button").onclick = () => dialog.close();
  dialog.addEventListener("close", () => dialog.remove());
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.showModal();
}
async function overlayMode() {
  document.title = "Callback — OBS overlay";
  document.body.className = "overlay-only";
  document.body.innerHTML =
    '<div id="callback-card" class="callback-card"></div><div class="overlay-connection" role="status"></div>';
  const p = new URLSearchParams(location.search),
    room = p.get("room"),
    key = p.get("key"),
    sourceMode = p.get("mode") || "live";
  let retry = 0,
    socket;
  const status = (message) => {
    const el = $(".overlay-connection");
    el.textContent = message;
    el.style.display = message ? "block" : "none";
  };
  function connect() {
    if (!room || !key) {
      status(
        "Open your Callback studio and copy the browser source link from Overlay.",
      );
      return;
    }
    socket = new WebSocket(
      `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/api/overlay?room=${encodeURIComponent(room)}&key=${encodeURIComponent(key)}`,
    );
    socket.onopen = () => {
      retry = 0;
      status("");
    };
    socket.onmessage = (e) => {
      let event;
      try {
        event = JSON.parse(e.data);
      } catch {
        return;
      }
      if (event.type === "callback") {
        if (sourceMode === "live" && event.demo) return;
        if (sourceMode === "demo" && !event.demo) return;
        clearTimeout(airTimer);
        showCard($("#callback-card"), event.clip, {
          demo: !!event.demo,
          auto: true,
          duration: event.duration || 20,
        });
        airTimer = setTimeout(
          () => {
            $("#callback-card").classList.add("leaving");
            setTimeout(() => {
              $("#callback-card").innerHTML = "";
              $("#callback-card").className = "callback-card";
            }, 450);
          },
          (event.duration || 20) * 1000,
        );
      }
    };
    socket.onclose = () => {
      status("Overlay reconnecting. Keep your Callback studio open.");
      setTimeout(connect, Math.min(30000, 1000 * 2 ** Math.min(retry++, 5)));
    };
    socket.onerror = () => socket.close();
  }
  connect();
}
if (["/overlay", "/overlay/", "/overlay.html"].includes(location.pathname)) {
  overlayMode();
} else {
  startStudio();
}
function startStudio() {
  $$("[data-icon]").forEach((el) => (el.outerHTML = icon(el.dataset.icon)));
  const mark =
    '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M35 16a15 15 0 1 0 1 17M35 5v12H23" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  $$(
    ".brandmark,.orbit-mark,.engine-symbol>span,.strip-symbol,.trail-icon",
  ).forEach((el) => (el.innerHTML = mark));
  $(".connect-illustration").innerHTML = mark + icon("chat");
  const savedTheme = stored("callback-theme", null);
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;
  function themeIcon() {
    const dark =
      document.documentElement.dataset.theme === "dark" ||
      (!document.documentElement.dataset.theme &&
        matchMedia("(prefers-color-scheme:dark)").matches);
    $("#theme").innerHTML = icon(dark ? "sun" : "moon");
    $("#theme").setAttribute(
      "aria-label",
      `Switch to ${dark ? "light" : "dark"} mode`,
    );
  }
  themeIcon();
  $("#theme").onclick = () => {
    const dark =
      getComputedStyle(document.documentElement).colorScheme === "dark";
    document.documentElement.dataset.theme = dark ? "light" : "dark";
    persist("callback-theme", dark ? "light" : "dark");
    themeIcon();
  };
  const state = {
    mode: "demo",
    settings: {
      threshold: 0.72,
      cooldown: 180,
      duration: 20,
      autoFire: false,
      chatBot: false,
      ...stored("callback-settings", {}),
    },
    clips: demoClips,
    user: null,
    session: null,
    config: null,
    history: [],
    candidate: null,
    seen: [],
    lastFire: 0,
    playing: false,
    speed: 1,
    elapsed: 0,
    index: 0,
    messages: [],
    scenario: 0,
    scenarioFired: false,
  };
  const demoOwner = demoLibrary.broadcaster.name;
  $("#channel-name").textContent = `${demoOwner}’s archive`;
  $("#channel-detail").textContent =
    `${demoClips.length} real clips · ${scenarios.length} replay scenarios`;
  $(".source-link").href = demoLibrary.broadcaster.url;
  $(".nav-count").textContent = demoClips.length;
  $("#stat-clips").innerHTML = `${demoClips.length}<span>clips</span>`;
  $("#scenario").innerHTML = scenarios
    .map(
      (scenario, i) => `<option value="${i}">${esc(scenario.label)}</option>`,
    )
    .join("");
  $("#library-subtitle").textContent =
    `Real clips from ${demoOwner}’s own channel. No borrowed archive.`;
  $(".credit-card").href = demoLibrary.broadcaster.url;
  $(".credit-card strong").textContent = demoOwner;
  $(".credit-avatar").textContent = demoOwner[0].toUpperCase();
  if (!demoClips.length) {
    $("#play").disabled = true;
    $("#stage-play").disabled = true;
    $("#stage-play").textContent = "First memories are being recorded";
    $("#scenario").disabled = true;
    $("#test-overlay").disabled = true;
    $("#stage-idle p").textContent = "Your first memories are being recorded.";
    $("#stage-idle>span").textContent =
      "The owner is creating original clips. The account-free replay will follow their first index.";
    $(".demo-banner p span").textContent =
      " The owner is recording original clips. No third-party archive is used.";
  }
  let lastTick = 0,
    tickTimer,
    socket,
    retry = 0,
    eventsub,
    liveBatch = [],
    batchTimer,
    liveActive = false,
    pendingTick;
  const chatTimes = [];
  const bars = $("#signal-bars");
  bars.setAttribute("role", "img");
  bars.setAttribute("aria-label", "Chat activity over the last 45 seconds");
  bars.innerHTML = Array.from(
    { length: 45 },
    (_, i) =>
      `<i style="--amplitude:${2 + ((i * 13) % 8)};--delay:${-(i % 7) * 0.13}s"></i>`,
  ).join("");
  function updateVelocity() {
    const now = Date.now();
    while (chatTimes[0] < now - 60000) chatTimes.shift();
    const buckets = Array.from(
      { length: 45 },
      (_, i) =>
        chatTimes.filter(
          (at) => at >= now - (45 - i) * 1000 && at < now - (44 - i) * 1000,
        ).length,
    );
    const peak = Math.max(3, ...buckets);
    [...bars.children].forEach((bar, i) => {
      bar.style.transform = `scaleY(${0.08 + (buckets[i] / peak) * 0.92})`;
    });
    $("#chat-rate").textContent = String(chatTimes.length);
    bars.setAttribute(
      "aria-label",
      `${chatTimes.length} messages in the last minute; 45-second activity graph`,
    );
  }
  setInterval(updateVelocity, 1000);
  updateVelocity();
  function renderPending(pending) {
    clearInterval(pendingTick);
    state.pendingCallback = pending;
    const update = () => {
      const el = $("#pending-callback");
      if (!el) return;
      el.hidden = !pending;
      if (pending) {
        const seconds = Math.max(
          0,
          Math.ceil((pending.dueAt - Date.now()) / 1000),
        );
        el.textContent = seconds
          ? `Airs in ${seconds}s · veto to hold this memory`
          : "Checking airing rules…";
      }
    };
    update();
    if (pending) pendingTick = setInterval(update, 200);
  }
  function view(name) {
    $$(".view").forEach((el) => {
      el.hidden = el.id !== name + "-view";
      el.classList.toggle("active", !el.hidden);
    });
    $$(".nav-item").forEach((b) => {
      b.classList.toggle("active", b.dataset.view === name);
      b.setAttribute(
        "aria-current",
        b.dataset.view === name ? "page" : "false",
      );
    });
    $(".topbar nav").classList.remove("open");
    if (name === "library") renderLibrary();
    if (name === "overlay") overlayLink();
  }
  $$(".nav-item").forEach((b) => (b.onclick = () => view(b.dataset.view)));
  $("#menu").onclick = () => $(".topbar nav").classList.toggle("open");
  $("#demo-info").onclick = () => view("guide");
  $("#setup-overlay").onclick = () => view("overlay");
  $("#expand-preview").onclick = () => {
    view("overlay");
    previewOverlay();
  };
  function overlayLink() {
    if (!state.session) return;
    const url = `${location.origin}/overlay?room=${state.session.room}&key=${state.session.overlayKey}&mode=${state.mode}`;
    $("#overlay-url").value = url;
    $("#open-overlay").href = url;
  }
  $("#copy-overlay").onclick = async () => {
    try {
      if (!$("#overlay-url").value)
        throw new Error("Your studio is connecting. Try again in a moment.");
      await navigator.clipboard.writeText($("#overlay-url").value);
      toast("Browser source copied. Paste it into OBS.");
    } catch (e) {
      $("#overlay-url").select();
      toast(e.message || "Select and copy the browser source link.", true);
    }
  };
  $("#rotate-overlay").onclick = async () => {
    try {
      const r = await api("/api/rotate-overlay", {});
      state.session.overlayKey = r.key;
      overlayLink();
      toast("New overlay link created. Update your OBS browser source.");
      connectSocket();
    } catch (e) {
      toast(e.message, true);
    }
  };
  function settingsUI() {
    const s = state.settings;
    $("#threshold").value = s.threshold * 100;
    $("#cooldown").value = s.cooldown;
    $("#duration").value = s.duration;
    $("#auto-fire").checked = s.autoFire;
    $("#chat-bot").checked = s.chatBot;
    settingLabels();
    $("#confidence-hint").textContent =
      `${Math.round(s.threshold * 100)}% min. confidence`;
    $("#stat-cooldown").innerHTML = `${s.cooldown / 60}<span>minutes</span>`;
  }
  function settingLabels() {
    $("#threshold-output").textContent = $("#threshold").value + "%";
    $("#cooldown-output").textContent =
      `${Number($("#cooldown").value) / 60} minutes`;
    $("#duration-output").textContent = $("#duration").value + " seconds";
  }
  ["threshold", "cooldown", "duration"].forEach(
    (id) => ($("#" + id).oninput = settingLabels),
  );
  settingsUI();
  $("#open-settings").onclick = () => {
    settingsUI();
    $("#settings-dialog").showModal();
  };
  $("#save-settings").onclick = async () => {
    const button = $("#save-settings");
    button.disabled = true;
    try {
      const s = {
        threshold: Number($("#threshold").value) / 100,
        cooldown: Number($("#cooldown").value),
        duration: Number($("#duration").value),
        autoFire: $("#auto-fire").checked,
        chatBot: $("#chat-bot").checked,
      };
      await api("/api/settings", s);
      state.settings = s;
      persist("callback-settings", s);
      settingsUI();
      $("#settings-dialog").close();
      toast("Engine settings saved. Your timing, your rules.");
    } catch (e) {
      toast(e.message, true);
    } finally {
      button.disabled = false;
    }
  };
  $$("dialog").forEach((d) =>
    d.addEventListener("click", (e) => {
      if (e.target === d) d.close();
    }),
  );
  function engine(status, title, description) {
    $("#engine-status").textContent = status;
    $("#engine-title").textContent = title;
    $("#engine-description").innerHTML = esc(description).replace(
      /\n/g,
      "<br>",
    );
    $("#engine-status").classList.toggle("airing-label", status === "On air");
  }
  function addChat(user, text, bot = false) {
    if (!bot) {
      chatTimes.push(Date.now());
      updateVelocity();
    }
    const log = $("#chat-log");
    log.querySelector(".chat-empty")?.remove();
    const el = document.createElement("div");
    el.className = "chat-line" + (bot ? " bot" : "");
    const palette = [
      "#8b8260",
      "#718d7c",
      "#af785f",
      "#8f81a7",
      "#8193a6",
      "#a28a62",
    ];
    el.innerHTML = `<time>${time(state.elapsed)}</time><strong style="color:${bot ? "var(--accent)" : palette[names.indexOf(user) % palette.length] || palette[0]}">${esc(user)}</strong><span>${esc(text)}</span>`;
    log.append(el);
    while (log.children.length > 80) log.firstElementChild.remove();
    log.scrollTop = log.scrollHeight;
  }
  function renderCandidate(c, verdict) {
    state.candidate = c;
    const container = $("#candidate");
    container.classList.remove("hidden");
    container.innerHTML = `<div class="candidate-header"><span>${verdict.ok ? "A FAMILIAR MOMENT" : "CONNECTION HELD"}</span><span>${Math.round(c.score * 100)}% match</span></div><h4>${esc(c.title)}</h4><p>${esc(c.reason)}</p><p style="margin-top:6px">${esc(verdict.reason)}</p><p id="pending-callback" class="pending-callback" role="status" hidden></p><div class="candidate-controls"><button class="button primary" id="fire-candidate" ${verdict.ok ? "" : "disabled"}>${icon("play")} Air callback</button><button class="button button-white" id="veto-candidate">Veto</button></div>`;
    renderPending(
      state.pendingCallback?.id === c.id ? state.pendingCallback : null,
    );
    $("#fire-candidate").onclick = () => fire(c);
    $("#veto-candidate").onclick = async () => {
      if (state.mode === "live") {
        try {
          await api("/api/veto", { id: c.id });
        } catch (e) {
          toast(e.message, true);
          return;
        }
      }
      state.seen.push(c.id);
      state.candidate = null;
      container.classList.add("hidden");
      engine(
        "Listening",
        "Let that one pass.",
        "Waiting for a better connection.",
      );
      toast("Memory vetoed. It won’t air again this session.");
    };
    $("#stat-confidence").innerHTML =
      `${Math.round(c.score * 100)}<span>% semantic similarity</span>`;
  }
  async function fire(c, forcePreview = false) {
    if (state.mode === "live" && !forcePreview) {
      try {
        await api("/api/fire", { id: c.id });
      } catch (e) {
        toast(e.message, true);
      }
      return;
    }
    if (!forcePreview) {
      const sorted = rank(
        state.messages
          .slice(-5)
          .map((m) => m.text)
          .join(" "),
        state.clips,
      );
      const verdict = decision(c, {
        threshold: state.settings.threshold,
        cooldown: 8,
        lastFire: state.lastFire,
        seen: state.seen,
        runnerUp: c.runnerUp ?? sorted[1]?.score ?? 0,
      });
      if (!verdict.ok) {
        toast(verdict.reason, true);
        return;
      }
      state.seen.push(c.id);
      state.lastFire = Date.now();
      state.scenarioFired = true;
    }
    receiveCallback(c, true, forcePreview);
    api("/api/demo-broadcast", { id: c.id, reason: c.reason }).catch(() =>
      toast("Local preview aired. The remote overlay is reconnecting.", true),
    );
  }
  function receiveCallback(c, demo = true, preview = false) {
    if (!preview) renderPending(null);
    clearTimeout(airTimer);
    showCard($("#callback-card"), c, {
      demo,
      duration: state.settings.duration,
      auto: $("#stage").clientWidth > 620,
    });
    $("#stage-idle").style.opacity = "0";
    engine(
      "On air",
      "There it is. That feeling.",
      "An old moment. A brand-new reaction.",
    );
    bars.classList.add("listening");
    if (!preview) {
      state.lastFire = Date.now();
      state.history.unshift({
        ...c,
        at: Date.now(),
        source: demo ? "scripted-replay" : "live",
        evidence: state.messages.slice(-5).map((m) => m.text),
      });
      renderTrail();
      $("#stat-callbacks").innerHTML =
        `${state.history.length}<span>moments</span>`;
      $("#stat-last").textContent =
        `Last callback · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      $("#stat-confidence").innerHTML =
        `${Math.round((c.score || 0.9) * 100)}<span>% semantic similarity</span>`;
      addChat(
        "callback",
        `↶ Remember this? ${c.title} · ${date(c.date)}${demo ? " [demo]" : ""}`,
        true,
      );
    }
    $("#candidate").classList.add("hidden");
    airTimer = setTimeout(() => {
      $("#callback-card").classList.add("leaving");
      setTimeout(() => {
        $("#callback-card").innerHTML = "";
        $("#callback-card").className = "callback-card";
        $("#stage-idle").style.opacity = "1";
        engine(
          state.playing ? "Listening" : "Ready",
          "Give the moment some room.",
          "Cooldown keeps callbacks special.",
        );
      }, 450);
    }, state.settings.duration * 1000);
  }
  function renderTrail() {
    const list = $("#trail-list");
    $("#trail-count").textContent =
      state.history.length +
      " moment" +
      (state.history.length === 1 ? "" : "s");
    if (!state.history.length) {
      list.innerHTML =
        '<div class="trail-empty"><span>↶</span><p>Your first callback starts the story.</p><small>Strong connections will leave their evidence here.</small></div>';
      return;
    }
    list.innerHTML = state.history
      .map(
        (c) =>
          `<article class="trail-item"><time>${new Date(c.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time><div><h4>${esc(c.title)}</h4><p>${esc(c.reason)}</p><div class="trail-evidence"><span>Threshold cleared</span><span>Distinctive match</span><span>${c.source === "scripted-replay" ? "Scripted replay" : "Own channel"}</span></div></div><span class="trail-score">${Math.round((c.score || 0.9) * 100)}%</span></article>`,
      )
      .join("");
  }
  $("#export-session").onclick = () => {
    if (!state.history.length) {
      toast("Air a callback first, then export its evidence.");
      return;
    }
    const report = {
      product: "Callback",
      exportedAt: new Date().toISOString(),
      mode: state.mode,
      settings: state.settings,
      moments: state.history.map(({ vector, ...c }) => c),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download =
      "callback-session-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Session evidence exported.");
  };
  function renderDirector(candidates, source, latency = 0) {
    const c = candidates[0];
    if (!c) return;
    const runnerUp = candidates[1]?.score ?? c.runnerUp ?? 0,
      margin = c.score - runnerUp;
    $("#retrieval-mode").textContent =
      source === "neural"
        ? "Neural · BGE"
        : source === "live"
          ? "Live · BGE"
          : "Local backup";
    $("#director-title").textContent = c.title;
    $("#director-copy").textContent = c.reason;
    $("#rival-matches").innerHTML = candidates
      .slice(0, 3)
      .map(
        (item) =>
          `<div class="rival-row"><span>${esc(item.title)}</span><span class="rival-track"><i style="transform:scaleX(${Math.max(0, Math.min(1, item.score))})"></i></span><strong>${Math.round(item.score * 100)}%</strong></div>`,
      )
      .join("");
    const checks = [
      [c.score >= state.settings.threshold, "Strong similarity"],
      [margin >= 0.08, "Distinctive connection"],
      [
        new Set(state.messages.map((m) => m.user)).size >= 3 ||
          state.mode === "live",
        "Multiple voices",
      ],
      [
        Date.now() - state.lastFire >=
          (state.mode === "demo" ? 8 : state.settings.cooldown) * 1000,
        "Cooldown clear",
      ],
      [!state.seen.includes(c.id), "Not already aired"],
    ];
    $("#safety-gates").innerHTML = checks
      .map(
        ([ok, label]) =>
          `<span class="${ok ? "passed" : ""}">${ok ? "✓" : "○"} ${label}</span>`,
      )
      .join("");
    $("#retrieval-evidence").textContent =
      `${source === "neural" ? "BGE Small English v1.5" : source === "live" ? "Live neural retrieval" : "Local concept-assisted vectors"} · ${Math.round(margin * 100)}pt separation${latency ? " · " + latency + "ms search" : ""} · ${state.messages.slice(-5).length} recent messages · API-verified archive`;
  }
  async function matchReplay() {
    if (state.messages.length < 3 || state.scenarioFired) return;
    const generation = state.generation || 0,
      index = state.messages.length,
      scenario = state.scenario;
    const query = state.messages
      .slice(-5)
      .map((m) => m.text)
      .join(" ");
    let candidates,
      source = "neural",
      latency = 0;
    try {
      const result = await Promise.race([
        api("/api/demo/search", { scenario, index }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Search timeout")), 4500),
        ),
      ]);
      candidates = result.matches;
      latency = result.latencyMs;
    } catch {
      candidates = rank(query, demoClips);
      source = "local";
    }
    if (
      (state.generation || 0) !== generation ||
      state.scenario !== scenario ||
      state.scenarioFired ||
      index < (state.appliedIndex || 0)
    )
      return;
    state.appliedIndex = index;
    const c = candidates[0];
    if (!c) return;
    c.runnerUp = candidates[1]?.score || 0;
    c.retrievalSource = source;
    renderDirector(candidates, source, latency);
    const verdict = decision(c, {
      threshold: state.settings.threshold,
      cooldown: 8,
      lastFire: state.lastFire,
      seen: state.seen,
      runnerUp: c.runnerUp,
    });
    if (c.score > 0.42) {
      renderCandidate(c, verdict);
      if (verdict.ok) {
        engine(
          "Match found",
          "Wait. We’ve been here before.",
          "A distinctive connection just cleared the threshold.",
        );
        if (!state.matchDue) {
          state.matchDue = Math.min(44, state.elapsed + 5);
          $(".timeline-marker").style.left = (state.elapsed / 45) * 100 + "%";
        }
        if (state.elapsed >= 45) fire(c);
      } else engine("Listening", "Something feels familiar…", verdict.reason);
    }
  }
  function updatePlay() {
    if ($("#stage-play"))
      $("#stage-play").innerHTML = state.playing
        ? "Pause replay <span>Ⅱ</span>"
        : "Let’s replay <span>↗</span>";
    const b = $("#play");
    b.innerHTML =
      icon(state.playing ? "pause" : "play") +
      (state.playing
        ? " Pause replay"
        : state.elapsed >= 45
          ? " Replay scene"
          : " Start replay");
    bars.classList.toggle("listening", state.playing);
    $("#replay-status").textContent = state.playing
      ? "Replaying a familiar conversation"
      : state.elapsed >= 45
        ? "Scene complete. Try another memory."
        : state.elapsed > 0
          ? "Paused. The memories can wait."
          : "Ready when you are";
  }
  function resetReplay() {
    chatTimes.length = 0;
    renderPending(null);
    state.generation = (state.generation || 0) + 1;
    state.appliedIndex = 0;
    clearInterval(tickTimer);
    clearTimeout(airTimer);
    state.playing = false;
    state.elapsed = 0;
    state.index = 0;
    state.messages = [];
    state.seen = [];
    state.lastFire = 0;
    state.candidate = null;
    state.scenarioFired = false;
    state.matchDue = null;
    $("#chat-log").innerHTML =
      '<div class="chat-empty">' +
      icon("chat") +
      "<p>The usual suspects.<br>The same great memories.</p><small>Chat appears when the replay starts.</small></div>";
    $("#candidate").classList.add("hidden");
    $("#callback-card").className = "callback-card";
    $("#callback-card").innerHTML = "";
    $("#stage-idle").style.opacity = "1";
    $("#timeline-progress").style.transform = "scaleX(0)";
    $("#replay-time").textContent = "00:00";
    $(".stage-clock").textContent = "00:00";
    $("#chat-rate").textContent = "0";
    engine(
      "Ready",
      "Waiting for a familiar feeling",
      "Chat brings the context.\nYour archive brings the memories.",
    );
    updatePlay();
  }
  function tick() {
    const now = performance.now();
    state.elapsed = Math.min(
      45,
      state.elapsed + ((now - lastTick) / 1000) * state.speed,
    );
    lastTick = now;
    const scenario = scenarios[state.scenario];
    const interval = 34 / scenario.messages.length;
    while (
      state.index < scenario.messages.length &&
      state.elapsed >= 2 + state.index * interval
    ) {
      const text = scenario.messages[state.index],
        user = names[state.index % names.length];
      state.messages.push({ user, text });
      addChat(user, text);
      state.index++;
      matchReplay();
    }
    if (
      state.matchDue &&
      state.elapsed >= state.matchDue &&
      !state.scenarioFired &&
      state.candidate
    ) {
      fire(state.candidate);
      state.matchDue = null;
    }
    $("#timeline-progress").style.transform = `scaleX(${state.elapsed / 45})`;
    $("#replay-time").textContent = time(state.elapsed);
    $(".stage-clock").textContent = time(state.elapsed);
    if (state.elapsed >= 45) {
      state.playing = false;
      clearInterval(tickTimer);
      updatePlay();
      if (!state.scenarioFired)
        engine(
          "Held",
          "Nothing forced. Nothing awkward.",
          "No match cleared your settings. Try another scene or adjust confidence.",
        );
    }
  }
  $("#play").onclick = () => {
    if (state.elapsed >= 45) resetReplay();
    state.playing = !state.playing;
    if (state.playing) {
      engine(
        "Listening",
        "Listening for a familiar feeling",
        "The conversation is building.\nYour archive is ready.",
      );
      lastTick = performance.now();
      tickTimer = setInterval(tick, 180);
    } else clearInterval(tickTimer);
    updatePlay();
  };
  $("#stage-play").onclick = () => {
    $("#play").click();
    $("#stage-play").innerHTML = state.playing
      ? "Pause replay <span>Ⅱ</span>"
      : "Let’s replay <span>↗</span>";
  };
  $("#reset").onclick = () => {
    resetReplay();
    toast("Replay rewound. The archive remembers.");
  };
  $("#scenario").onchange = () => {
    state.scenario = Number($("#scenario").value);
    resetReplay();
  };
  $$("[data-speed]").forEach(
    (b) =>
      (b.onclick = () => {
        state.speed = Number(b.dataset.speed);
        $$("[data-speed]").forEach((x) =>
          x.classList.toggle("active", x === b),
        );
      }),
  );
  function renderLibrary() {
    const q = $("#library-search").value.toLowerCase(),
      category = $("#category-filter").value;
    const list = state.clips.filter(
      (c) =>
        (!category || c.category === category) &&
        (!q ||
          `${c.title} ${c.category} ${c.context || ""}`
            .toLowerCase()
            .includes(q)),
    );
    $("#library-grid").innerHTML = list.length
      ? list
          .map(
            (c) =>
              `<article class="panel clip-card"><div class="clip-art"><img src="${esc(artwork(c))}" alt="Original clip thumbnail" loading="lazy" width="600" height="340"><span class="category-tag">${esc(c.category)}</span><span class="clip-duration">${time(c.duration)}</span></div><div class="clip-card-body"><h3>${esc(c.title)}</h3><div class="clip-card-meta"><span>${date(c.date)}</span><span>${num(c.views)} views</span></div><p class="clip-reason">${state.mode === "demo" ? `An original memory from ${esc(demoOwner)}’s own channel. Play the clip or preview its overlay entrance.` : "Indexed from your connected channel. Ready for a distinctive live connection."}</p><div class="clip-actions"><button class="button button-white" data-watch="${esc(c.id)}">${icon("play")} Watch clip</button><button class="button button-white" data-preview="${esc(c.id)}">Preview overlay ↗</button></div></div></article>`,
          )
          .join("")
      : '<div class="library-empty"><span>↶</span><h3>A memory is waiting to be found.</h3><p>' +
        (state.clips.length
          ? "Try another phrase or choose a different category."
          : "Index your own clips to give this channel a memory.") +
        "</p></div>";
    $$("[data-watch]").forEach(
      (b) =>
        (b.onclick = () =>
          playOriginal(state.clips.find((c) => c.id === b.dataset.watch))),
    );
    $$("[data-preview]").forEach(
      (b) =>
        (b.onclick = () => {
          const c = state.clips.find((c) => c.id === b.dataset.preview);
          view("overlay");
          previewOverlay(c);
        }),
    );
  }
  function categories() {
    const existing = $("#category-filter").value;
    $("#category-filter").innerHTML =
      '<option value="">All categories</option>' +
      [...new Set(state.clips.map((c) => c.category))]
        .sort()
        .map((c) => `<option>${esc(c)}</option>`)
        .join("");
    $("#category-filter").value = existing;
  }
  categories();
  $("#library-search").oninput = renderLibrary;
  $("#category-filter").onchange = renderLibrary;
  let sampleTimer;
  function previewOverlay(
    c = state.mode === "live"
      ? state.clips[0]
      : demoClips[scenarios[state.scenario]?.clip],
  ) {
    if (!c) {
      toast("Index your own clips before previewing a live overlay.", true);
      return;
    }
    clearTimeout(sampleTimer);
    const el = $("#overlay-sample");
    el.innerHTML = '<div class="callback-card"></div>';
    $(".overlay-empty").style.opacity = "0";
    showCard(
      el.firstElementChild,
      { ...c, reason: c.reason || "A familiar moment, right on cue." },
      { demo: state.mode === "demo", duration: 12 },
    );
    sampleTimer = setTimeout(() => {
      el.firstElementChild?.classList.add("leaving");
      setTimeout(() => {
        el.innerHTML = "";
        $(".overlay-empty").style.opacity = "1";
      }, 450);
    }, 12000);
    api(state.mode === "demo" ? "/api/demo-broadcast" : "/api/preview", {
      id: c.id,
      reason: "Overlay preview from the demo library.",
    })
      .then(() => toast("Preview sent to your connected OBS overlay."))
      .catch(() =>
        toast("Preview is playing here. Your overlay is reconnecting.", true),
      );
  }
  $("#test-overlay").onclick = () => previewOverlay();
  $("#download-obs").onclick = () => {
    if (!$("#overlay-url").value) {
      toast("Your studio is connecting. Try again in a moment.", true);
      return;
    }
    const collection = {
      name: "Callback",
      current_scene: "Callback live",
      current_program_scene: "Callback live",
      scene_order: [{ name: "Callback live" }],
      sources: [
        {
          name: "Callback overlay",
          id: "browser_source",
          versioned_id: "browser_source",
          settings: {
            url: $("#overlay-url").value,
            width: 1920,
            height: 1080,
            fps: 30,
            shutdown: false,
            restart_when_active: false,
            reroute_audio: true,
          },
          enabled: true,
          muted: true,
        },
        {
          name: "Callback live",
          id: "scene",
          versioned_id: "scene",
          settings: {
            items: [
              {
                name: "Callback overlay",
                visible: true,
                locked: false,
                pos: { x: 0, y: 0 },
                scale: { x: 1, y: 1 },
                rot: 0,
                align: 5,
                bounds_type: 0,
                scale_filter: "disable",
                id: 1,
              },
            ],
          },
        },
      ],
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(collection, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "Callback-OBS-scene.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(
      "OBS scene downloaded. Import it through Scene Collection → Import. Keep the file private.",
    );
  };
  async function connectDialog() {
    $("#connect-dialog").showModal();
    const target = $("#connect-state");
    target.innerHTML =
      '<div class="setup-warning">Checking your channel connection…</div>';
    try {
      state.config = await api("/api/config");
      if (state.user) {
        $("#connect-description").textContent =
          `Connected as ${state.user.name}. Index your clip library and start listening when you go live.`;
        target.innerHTML =
          '<button class="button primary" id="go-live">Open my live studio ↗</button><button class="button button-white" id="disconnect">Disconnect account</button>';
        $("#go-live").onclick = () => {
          liveMode();
          $("#connect-dialog").close();
        };
        $("#disconnect").onclick = async () => {
          try {
            await api("/api/disconnect", {});
            location.href = "/";
          } catch (e) {
            toast(e.message, true);
          }
        };
      } else if (state.config.twitchConfigured) {
        target.innerHTML =
          '<a class="button primary" href="/auth/twitch">Connect my Twitch account ↗</a>';
      } else {
        target.innerHTML =
          '<div class="setup-warning"><strong>The replay is ready. Live Twitch needs app credentials.</strong><br>The deployment owner must register a Twitch app and set <code>TWITCH_CLIENT_ID</code> and <code>TWITCH_CLIENT_SECRET</code> in Cloudflare. The redirect URL is:<br><code>' +
          esc(location.origin) +
          '/auth/callback</code></div><a class="button button-white" href="https://dev.twitch.tv/console/apps" target="_blank" rel="noreferrer">Open developer console ↗</a><button class="button primary" id="stay-demo">Try the interactive demo</button>';
        $("#stay-demo").onclick = () => {
          $("#connect-dialog").close();
          view("studio");
          $("#play").focus();
        };
      }
    } catch (e) {
      target.textContent = e.message;
    }
  }
  $("#connect").onclick = connectDialog;
  $("#close-connect").onclick = () => $("#connect-dialog").close();
  $("#index-clips").onclick = async () => {
    if (!state.user) {
      connectDialog();
      return;
    }
    if (state.mode !== "live") liveMode();
    const button = $("#index-clips");
    button.disabled = true;
    try {
      await api("/api/index", {});
      $("#index-progress").classList.remove("hidden");
      $("#index-progress strong").textContent =
        "Fetching your channel’s clips…";
      toast("Building your channel’s memory bank.");
    } catch (e) {
      button.disabled = false;
      toast(e.message, true);
    }
  };
  function liveMode() {
    resetReplay();
    state.mode = "live";
    state.clips = state.session.clips || [];
    $("#test-overlay").disabled = !state.clips.length;
    state.lastFire = state.session.lastFire || 0;
    state.seen = state.session.seen || [];
    state.history = (state.session.history || []).map((moment) => ({
      ...moment,
      source: "live",
    }));
    renderTrail();
    $("#stat-callbacks").innerHTML =
      state.history.length + "<span>moments</span>";
    if (state.history.length) {
      $("#stat-confidence").innerHTML =
        Math.round(state.history[0].score * 100) +
        "<span>% semantic similarity</span>";
      $("#stat-last").textContent =
        "Last callback · " +
        new Date(state.history[0].at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
    } else {
      $("#stat-confidence").innerHTML = "—<span>waiting for a match</span>";
      $("#stat-last").textContent = "The next inside joke starts here";
    }
    state.settings = { ...state.settings, ...state.session.settings };
    document.body.classList.add("live-mode");
    $(".workspace").innerHTML =
      '<span class="status-dot"></span> ' + esc(state.user.name) + "’s studio";
    $(".demo-label").innerHTML =
      '<span class="status-dot"></span> LIVE WORKSPACE';
    $(".demo-banner p").innerHTML =
      "<strong>Your channel. Your memories.</strong><span> Index your clips, then listen for the moments your community recognizes.</span>";
    $(".demo-banner button").onclick = () => (location.href = "/?demo=1");
    $(".demo-banner button").innerHTML = "Back to demo ↗";
    $(".onair").innerHTML = '<span class="status-dot"></span> LIVE CHANNEL';
    $("#channel-name").textContent = state.user.name;
    $("#channel-detail").textContent =
      state.clips.length + " indexed clips · your channel only";
    $(".source-link").href =
      "https://www.twitch.tv/" + encodeURIComponent(state.user.login);
    $("#library-subtitle").textContent =
      "Only clips from your own connected channel are indexed or aired.";
    $(".nav-count").textContent = state.clips.length;
    $("#stat-clips").innerHTML = state.clips.length + "<span>clips</span>";
    $(".replay-top h2").textContent = "Your community is the signal.";
    $(".replay-top .eyebrow").textContent = "THE LIVE CONTROL ROOM";
    $(".replay-length").textContent = "Authenticated chat · EventSub";
    $(".scenario-row").innerHTML =
      '<button class="button primary" id="listen">' +
      icon("chat") +
      ' Listen to my chat</button><button class="button button-white" id="live-index">' +
      icon("layers") +
      " Index my clips</button>";
    $("#stage-play").hidden = true;
    $(".replay-timeline").hidden = true;
    $(".speed-control").hidden = true;
    $("#replay-status").textContent = "Connect live chat when you’re ready.";
    $("#listen").onclick = () => (liveActive ? stopLive() : startLive());
    $("#live-index").onclick = () => $("#index-clips").click();
    $("#chat-log").innerHTML =
      '<div class="chat-empty">' +
      icon("chat") +
      "<p>Your community sets the scene.</p><small>Start listening to connect your live chat.</small></div>";
    $(".chat-footer").innerHTML =
      '<span class="mini-dot"></span> Live chat from your own connected channel.';
    $(".chat-panel .panel-title").innerHTML = icon("chat") + " Live chat";
    $("#stage-idle p").textContent = "Your next inside joke starts here.";
    $("#stage-idle>span").textContent =
      "The landscape is a preview backdrop. Your OBS source is transparent.";
    $(".scene-label>span:nth-child(2)").textContent =
      state.user.name + "’s control room";
    $(".scene-label small").textContent =
      "Illustrated preview · your live video stays in OBS";
    categories();
    settingsUI();
    renderLibrary();
    if (state.session.candidate) {
      const candidate = state.session.candidate;
      renderCandidate(
        candidate,
        decision(candidate, {
          ...state.settings,
          lastFire: state.lastFire,
          seen: state.seen,
          runnerUp: candidate.runnerUp,
        }),
      );
      renderPending(state.session.pendingCallback);
    }
    view("studio");
  }
  function stopLive() {
    liveActive = false;
    liveBatch = [];
    renderPending(null);
    api("/api/pause", {}).catch((e) => toast(e.message, true));
    eventsub?.close();
    clearInterval(batchTimer);
    $("#listen").innerHTML = icon("chat") + " Listen to my chat";
    $("#replay-status").textContent =
      "Chat paused. Start listening when you’re ready.";
    bars.classList.remove("listening");
    engine(
      "Ready",
      "The archive is ready.",
      "Start listening when your community is here.",
    );
  }
  function startLive() {
    if (liveActive) return;
    if (!state.clips.length) {
      toast("Index your own clips before starting the engine.", true);
      view("library");
      return;
    }
    liveActive = true;
    liveBatch = [];
    $("#listen").innerHTML = icon("pause") + " Stop listening";
    $("#replay-status").textContent = "Connecting to your live chat…";
    engine(
      "Connecting",
      "Finding your community…",
      "Opening an authenticated chat connection.",
    );
    openEventsub();
    batchTimer = setInterval(async () => {
      if (!liveBatch.length || !liveActive) return;
      const batch = liveBatch.splice(0, 100);
      try {
        await api("/api/ingest", { messages: batch });
      } catch (e) {
        toast(e.message, true);
      }
    }, 5500);
  }
  function openEventsub(url = "wss://eventsub.wss.twitch.tv/ws") {
    if (!liveActive) return;
    if (!url.startsWith("wss://eventsub.wss.twitch.tv/")) {
      toast("Twitch returned an unexpected reconnect address.", true);
      stopLive();
      return;
    }
    const transferring = url !== "wss://eventsub.wss.twitch.tv/ws";
    const next = new WebSocket(url);
    eventsub = next;
    let keepalive;
    next.onmessage = async (e) => {
      try {
        const event = JSON.parse(e.data),
          type = event.metadata?.message_type;
        clearTimeout(keepalive);
        keepalive = setTimeout(() => {
          next.close();
        }, 45000);
        if (type === "session_welcome") {
          if (!transferring) {
            const subscription = await api("/api/eventsub", {
              sessionId: event.payload.session.id,
            });
            if (!subscription.connected)
              throw new Error(
                "Twitch did not establish the chat subscription. Reconnect and try again.",
              );
          }
          $("#replay-status").textContent = "Listening to #" + state.user.login;
          bars.classList.add("listening");
          engine(
            "Listening",
            "Your community is the signal.",
            "Waiting for three voices and a distinctive connection.",
          );
        }
        if (type === "notification") {
          const m = event.payload.event;
          if (m.message?.text) {
            if (
              m.chatter_user_id === state.user.id &&
              m.message.text.startsWith("↶ Callback:")
            )
              return;
            const msg = { user: m.chatter_user_name, text: m.message.text };
            liveBatch.push(msg);
            if (liveBatch.length > 200) liveBatch.shift();
            addChat(msg.user, msg.text);
          }
        }
        if (type === "session_reconnect") {
          openEventsub(event.payload.session.reconnect_url);
          next.close();
        }
        if (type === "revocation") {
          toast("Chat access was revoked. Please reconnect Twitch.", true);
          stopLive();
        }
      } catch (e) {
        toast(e.message, true);
        stopLive();
      }
    };
    next.onclose = () => {
      clearTimeout(keepalive);
      if (liveActive && next === eventsub) {
        $("#replay-status").textContent = "Chat reconnecting…";
        setTimeout(() => openEventsub(), 3000);
      }
    };
    next.onerror = () => next.close();
  }
  function connectSocket() {
    if (!state.session) return;
    socket?.close();
    const active = new WebSocket(
      `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/api/socket`,
    );
    socket = active;
    active.onopen = () => (retry = 0);
    active.onmessage = (e) => {
      let event;
      try {
        event = JSON.parse(e.data);
      } catch {
        return;
      }
      if (event.type === "presence" && $("#obs-status")) {
        const count = event.connections?.overlay || 0;
        $("#obs-status").textContent = count
          ? `OBS connected · ${count} browser source${count === 1 ? "" : "s"}`
          : "OBS not connected · 1920 × 1080";
      }
      if (event.type === "callback" && !event.demo && state.mode === "live")
        receiveCallback(event.clip, false, !!event.preview);
      if (event.type === "candidate" && state.mode === "live") {
        renderCandidate(event.candidate, event.verdict);
        renderDirector(event.matches || [event.candidate], "live");
      }
      if (event.type === "callback-pending" && state.mode === "live")
        renderPending(event.pending);
      if (event.type === "veto" && state.mode === "live") {
        renderPending(null);
        if (state.candidate?.id === event.id) {
          state.candidate = null;
          $("#candidate").classList.add("hidden");
        }
      }
      if (event.type === "bot-sent" && state.mode === "live")
        toast("Twitch confirmed the callback link was posted in chat.");
      if (event.type === "error") {
        toast(event.message, true);
        $("#index-clips").disabled = false;
        $("#index-progress").classList.add("hidden");
      }
      if (event.type === "index-progress") {
        $("#index-progress").classList.remove("hidden");
        $("#index-progress strong").textContent = event.label;
        $("#index-progress progress").value = event.progress;
      }
      if (event.type === "index-complete") {
        state.session.clips = event.clips;
        if (state.mode === "live") {
          state.clips = event.clips;
          $("#test-overlay").disabled = !state.clips.length;
          $("#stat-clips").innerHTML = event.count + "<span>clips</span>";
          $(".nav-count").textContent = event.count;
          $("#channel-detail").textContent =
            event.count + " indexed clips · your channel only";
          categories();
          renderLibrary();
        }
        $("#index-progress").classList.add("hidden");
        $("#index-clips").disabled = false;
        toast(
          event.count
            ? `${event.count} memories indexed. Your archive is ready.`
            : "No clips found on this channel yet. Create a few clips, then index again.",
        );
      }
      if (event.type === "settings" && state.mode === "live") {
        state.settings = event.settings;
        settingsUI();
      }
    };
    active.onclose = () => {
      if (socket === active)
        setTimeout(
          connectSocket,
          Math.min(30000, 1000 * 2 ** Math.min(retry++, 5)),
        );
    };
    active.onerror = () => active.close();
  }
  api("/api/session")
    .then((session) => {
      state.session = session;
      state.user = session.user;
      overlayLink();
      connectSocket();
      if (session.user) {
        $("#connect").innerHTML = icon("check") + " " + esc(session.user.name);
        if (!new URLSearchParams(location.search).has("demo")) liveMode();
      }
    })
    .catch((e) =>
      toast("Studio sync is reconnecting. The local replay still works.", true),
    );
  const notice = new URLSearchParams(location.search).get("notice");
  if (notice) {
    const messages = {
      connected: "Your Twitch account is connected. Let’s index your history.",
      "auth-denied": "Connection cancelled. Your replay is still ready.",
      "auth-expired":
        "The connection link expired. Please try connecting again.",
      "auth-failed": "Twitch could not complete sign-in. Please try again.",
      "twitch-setup":
        "Live Twitch needs app credentials. The demo works without them.",
    };
    toast(messages[notice] || "Your studio is ready.", notice !== "connected");
    history.replaceState({}, "", location.pathname);
  }
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("reveal");
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.1 },
    );
    $$(".stat-card,.bottom-strip").forEach((e) => observer.observe(e));
  }
}
