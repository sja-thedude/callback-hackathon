import { embed } from "./engine.js";
import { demoLibrary } from "./demo-library.js";
import { buildScenarios } from "./replay.js";
export { demoLibrary };
export const clips = demoLibrary.clips.map((clip) => ({
  ...clip,
  vector: embed(`${clip.title} ${clip.category}`),
}));
export const scenarios = buildScenarios(demoLibrary);
export const names = [
  "cozyghost",
  "pixelpilot",
  "mapleleaf",
  "actuallyash",
  "thelastsave",
  "moonrat",
  "softreset",
  "lurkworks",
  "oldchat",
  "cloudnine",
  "tinychaos",
  "julesplays",
];
