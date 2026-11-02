import { buildScenarios } from "../public/replay.js";
export const library = {
  ownedContent: true,
  source: "test fixture",
  indexedAt: "2026-10-31T00:00:00Z",
  broadcaster: { id: "test-owner", name: "Test Owner" },
  clips: [
    "Forest sunrise over the valley",
    "Paper rocket lands in the mug",
    "Kitchen timer surprises the cook",
  ].map((title, i) => ({
    id: `fixture-owned-${i}`,
    title,
    category: "Original scenes",
    broadcaster: "Test Owner",
    broadcasterId: "test-owner",
    date: "2026-10-31T00:00:00Z",
    duration: 15,
    thumbnail: "https://example.com/owned-thumbnail.jpg",
    url: `https://clips.twitch.tv/fixture-owned-${i}`,
    creator: "Test Owner",
  })),
};
export const clips = library.clips;
export const scenarios = buildScenarios(library);
