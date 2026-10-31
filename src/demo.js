import { clips, scenarios, demoLibrary } from "../public/data.js";
import { rank, decision } from "../public/engine.js";
import { embeddingText } from "./clip-index.js";
const model = "@cf/baai/bge-small-en-v1.5";
const response = (data, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
export function createDemoRetriever({
  library = demoLibrary,
  archive = clips,
  replay = scenarios,
} = {}) {
  const inFlight = new Map();
  let libraryPromise;
  let revisionPromise;
  return async function retrieveDemo(request, env) {
    if (request.method !== "POST")
      return response({ error: "Use a replay search request." }, 405);
    const raw = await request.text();
    if (raw.length > 300)
      return response({ error: "Replay request is too large." }, 413);
    let input;
    try {
      input = JSON.parse(raw);
    } catch {
      return response({ error: "Invalid replay request." }, 400);
    }
    if (!input || typeof input !== "object" || Array.isArray(input))
      return response({ error: "Invalid replay request." }, 400);
    if (
      !library.ownedContent ||
      archive.some((clip) => clip.broadcasterId !== library.broadcaster.id)
    )
      return response(
        { error: "The demo archive must contain only verified owner clips." },
        503,
      );
    if (!archive.length)
      return response(
        {
          error:
            "The owner is recording the first memories. Published clips will appear here after indexing.",
        },
        503,
      );
    const scenario = replay[input.scenario];
    if (
      !Number.isInteger(input.scenario) ||
      !scenario ||
      !Number.isInteger(input.index) ||
      input.index < 3 ||
      input.index > scenario.messages.length
    )
      return response({ error: "Choose a valid recorded replay window." }, 400);
    const origin = new URL(request.url).origin;
    revisionPromise ||= crypto.subtle
      .digest(
        "SHA-256",
        new TextEncoder().encode(
          JSON.stringify({
            model,
            indexedAt: library.indexedAt,
            clips: archive.map((c) => [c.id, c.title, c.category]),
            scenarios: replay,
          }),
        ),
      )
      .then((bytes) =>
        [...new Uint8Array(bytes)]
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(""),
      );
    const revision = await revisionPromise;
    const key = new Request(
      origin +
        "/__callback-cache/" +
        revision +
        "/" +
        input.scenario +
        "/" +
        input.index,
    );
    const cache = globalThis.caches?.default;
    const hit = cache && (await cache.match(key));
    if (hit)
      return response({ ...(await hit.json()), cached: true, latencyMs: 0 });
    if (env.DEMO_LIMITER) {
      const quota = await env.DEMO_LIMITER.limit({
        key: "callback-demo-neural",
      });
      if (!quota.success)
        return response(
          {
            error:
              "The neural search is busy. Local retrieval will keep the replay moving.",
          },
          429,
        );
    }
    const workKey = input.scenario + ":" + input.index;
    if (inFlight.has(workKey)) return response(await inFlight.get(workKey));
    const work = (async () => {
      const start = Date.now();
      if (!libraryPromise)
        libraryPromise = (async () => {
          const key = new Request(
            origin + "/__callback-cache/" + revision + "/vectors",
          );
          const saved = cache && (await cache.match(key));
          if (saved) return saved.json();
          const vectors = (
            await env.AI.run(model, {
              text: archive.map(embeddingText),
            })
          ).data;
          if (!Array.isArray(vectors) || vectors.length !== archive.length)
            throw new Error("Invalid demo vector index.");
          if (cache)
            await cache.put(
              key,
              Response.json(vectors, {
                headers: { "Cache-Control": "public, max-age=604800" },
              }),
            );
          return vectors;
        })().catch((error) => {
          libraryPromise = undefined;
          throw error;
        });
      const query = scenario.messages
        .slice(Math.max(0, input.index - 5), input.index)
        .join(" ");
      const [vectors, result] = await Promise.all([
        libraryPromise,
        env.AI.run(model, { text: [query] }),
      ]);
      const matches = rank(
        query,
        archive.map((c, i) => ({ ...c, vector: vectors[i] })),
        result.data[0],
      );
      const candidate = matches[0],
        runnerUp = matches[1]?.score || 0;
      const output = {
        model: "BGE Small English v1.5",
        source: "neural",
        librarySource: library.source,
        indexedAt: library.indexedAt,
        scenario: input.scenario,
        index: input.index,
        latencyMs: Date.now() - start,
        margin: candidate.score - runnerUp,
        verdict: decision(candidate, { runnerUp }),
        matches: matches.slice(0, 3).map(({ vector, ...c }) => c),
      };
      if (cache)
        await cache.put(
          key,
          Response.json(output, {
            headers: { "Cache-Control": "public, max-age=86400" },
          }),
        );
      return output;
    })();
    inFlight.set(workKey, work);
    try {
      return response(await work);
    } catch {
      return response(
        {
          error:
            "Neural retrieval is temporarily unavailable. The local semantic index is ready.",
        },
        503,
      );
    } finally {
      inFlight.delete(workKey);
    }
  };
}
export const retrieveDemo = createDemoRetriever();
