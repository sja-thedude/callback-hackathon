export const STOP = new Set(
  "the a an and or is it of to in on this that for with was are you your i me we he so at have has not just again like".split(
    " ",
  ),
);
const groups = [
  [
    "bug",
    "bugs",
    "broken",
    "glitch",
    "glitches",
    "janky",
    "jank",
    "gameplay",
    "gotham",
    "knights",
  ],
  [
    "loop",
    "deathloop",
    "starfield",
    "repeat",
    "repeating",
    "stuck",
    "door",
    "doors",
  ],
  [
    "price",
    "expensive",
    "dollars",
    "paid",
    "seventy",
    "70",
    "redfall",
    "cost",
    "refund",
  ],
  [
    "smoke",
    "tactic",
    "tactical",
    "grenade",
    "counter",
    "strike",
    "5head",
    "strategy",
  ],
  ["spaceship", "citizen", "space", "ship", "landing", "revisiting"],
  [
    "hurricane",
    "storm",
    "wind",
    "flight",
    "flying",
    "simulator",
    "plane",
    "weather",
  ],
];
export const tokens = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((x) => x.length > 1 && !STOP.has(x));
export function embed(text) {
  const vector = Array(256).fill(0);
  for (const word of tokens(text)) {
    let h = 2166136261;
    for (const c of word) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    vector[(h >>> 0) % 224] += 1;
    const g = groups.findIndex((x) => x.includes(word));
    if (g >= 0) vector[224 + g] += 1.8;
  }
  const n = Math.hypot(...vector) || 1;
  return vector.map((x) => x / n);
}
export function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  return (
    a.reduce((s, v, i) => s + v * b[i], 0) /
    (Math.hypot(...a) * Math.hypot(...b) || 1)
  );
}
export function rank(query, clips, vector = null) {
  const q = vector || embed(query),
    words = tokens(query);
  return clips
    .map((clip) => {
      const context = `${clip.title} ${clip.category} ${clip.context || ""}`;
      const overlap = [
        ...new Set(words.filter((w) => tokens(context).includes(w))),
      ];
      const score = Math.max(
        0,
        cosine(q, vector ? clip.vector : embed(context)),
      );
      return {
        ...clip,
        score,
        overlap,
        reason: overlap.length
          ? `Chat echoed “${overlap.slice(0, 3).join(" · ")}” from this ${clip.category} moment.`
          : `A related ${clip.category} memory surfaced. Review the connection before airing.`,
      };
    })
    .sort((a, b) => b.score - a.score);
}
export function decision(
  candidate,
  {
    threshold = 0.72,
    cooldown = 180,
    lastFire = 0,
    now = Date.now(),
    seen = [],
    runnerUp = 0,
    manual = false,
  } = {},
) {
  if (!candidate) return { ok: false, reason: "No indexed memory matches yet" };
  if (candidate.score < threshold)
    return { ok: false, reason: "Below your confidence threshold" };
  if (candidate.score - runnerUp < 0.08)
    return { ok: false, reason: "Ambiguous match — holding for more context" };
  if (seen.includes(candidate.id))
    return { ok: false, reason: "Already aired this session" };
  if (now - lastFire < cooldown * 1000)
    return { ok: false, reason: "Cooldown protects the moment" };
  return {
    ok: true,
    reason: manual ? "Approved by streamer" : "Strong, distinctive connection",
  };
}
export function parseIRC(line) {
  const m = line.match(/^(?:@([^ ]+) )?:([^! ]+)!.* PRIVMSG #[^ ]+ :(.+)$/);
  if (!m) return null;
  const tags = Object.fromEntries(
    (m[1] || "").split(";").map((t) => t.split("=")),
  );
  return { user: tags["display-name"] || m[2], text: m[3], at: Date.now() };
}
