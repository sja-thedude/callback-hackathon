import { embed } from "./engine.js";
import { demoLibrary } from "./demo-library.js";
export { demoLibrary };
const context = [
  {
    art: "city",
    context: "broken buggy gameplay glitch janky gotham knights game bug",
  },
  {
    art: "space",
    context: "deathloop loop repeating stuck doors starfield repeat",
  },
  {
    art: "city",
    context: "seventy dollars price expensive paid 70 redfall refund cost",
  },
  {
    art: "tactic",
    context: "smoke grenade tactic tactical strategy counter strike 5head",
  },
  { art: "space", context: "spaceship citizen space ship landing revisiting" },
  {
    art: "flight",
    context: "hurricane storm wind flight flying simulator plane weather",
  },
];
export const clips = demoLibrary.clips.map((clip, index) => ({
  ...clip,
  ...context[index],
  vector: embed(`${clip.title} ${clip.category} ${context[index].context}`),
}));
export const scenarios = [
  {
    label: "History repeats itself",
    description: "A familiar glitch brings an old memory back.",
    clip: 0,
    messages: [
      "evening chat, what are we playing?",
      "wait why is he moving like that",
      "another game-breaking bug, of course",
      "this is giving me Gotham Knights flashbacks",
      "the same broken gameplay from that old clip",
      "Gotham Knights really had the wildest bugs",
      "someone find the janky Gotham Knights clip",
      "that glitch never gets old LUL",
      "Gotham Knights gameplay strikes again",
    ],
  },
  {
    label: "The community remembers",
    description: "One clever play, years of shared context.",
    clip: 3,
    messages: [
      "okay, this round is winnable",
      "he saved a smoke for this?",
      "wait, I remember this smoke tactic",
      "the old 5Head smoke grenade play!",
      "that Counter-Strike smoke strategy was legendary",
      "same smoke tactic, different round",
      "someone pull up the 5Head Smoke Tactic clip",
      "chat never forgot the grenade strategy",
    ],
  },
  {
    label: "A very expensive memory",
    description: "Chat recognizes a price tag it has seen before.",
    clip: 2,
    messages: [
      "new game, fresh start",
      "what did this one cost?",
      "seventy dollars? we have been here before",
      "remember paying 70 dollars for Redfall",
      "that Redfall price still hurts",
      "an expensive reminder to wait for reviews",
      "chat asked for a Redfall refund that day too",
      "someone find the 70 dollar Redfall clip",
    ],
  },
  {
    label: "Back in the loop",
    description: "A repeated moment unlocks an older one.",
    clip: 1,
    messages: [
      "did we already go through this room?",
      "not the door again",
      "Starfield has us stuck in the same loop",
      "this is the Deathloop 2 clip all over again",
      "another repeating Starfield door, incredible",
      "we were stuck in this exact loop in 2023",
      "Deathloop 2 PogChamp. chat remembers",
    ],
  },
];
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
