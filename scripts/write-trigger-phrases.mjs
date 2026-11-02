import fs from "node:fs";
import { moments } from "../public/moments.js";
export function writeTriggerPhrases(library) {
  const lines = [
    "# Live trigger phrases", "",
    `Channel **${library.broadcaster.name}** verified through Twitch Helix on ${library.indexedAt}. ${library.clips.length} published owner clips indexed.`, "",
    "For a solo reshoot, enable **Owner rehearsal** in Engine settings, choose automatic airing or approve an eligible candidate, and send the exact owner line below from **sjathedude**. Keep the studio listening. Allow about 15 seconds for batching, retrieval, and the seven-second veto window. The overlay visibly labels owner rehearsal.", "",
    "For community mode, disable Owner rehearsal and use the three assigned lines from three real chatters within 30 seconds. Multiple tabs of one account count as one voice. Confidence, ambiguity, ownership, freshness, cooldown, and duplicate gates apply in both modes.", "",
    ...(!library.clips.length ? ["No published clips are available yet; exact clip phrases remain pending.", ""] : []),
    ...library.clips.flatMap((clip, index) => {
      const moment = moments.find((item) => item.title === clip.title);
      const phrase = moment ? `${clip.title}. ${moment.phrase}.` : `${clip.title}. I remember ${clip.title}.`;
      return [`## ${index + 1}. ${clip.title}`, "", `Clip ID: \`${clip.id}\``, "", `[Original owned clip](${clip.url})`, "", `**Owner rehearsal — type exactly:** ${phrase}`, "", `- Chatter 1: ${clip.title}`, `- Chatter 2: I remember ${clip.title}`, `- Chatter 3: Bring back the ${clip.title} clip`, ""];
    }),
    "## Near-miss and repeat takes", "",
    "Let the previous chat window clear, or stop listening and restart to clear it. Use: **My laptop battery needs charging before tomorrow’s meeting.** Verify the actual held verdict before filming. Do not describe a weak or ambiguous match as eligible.", "",
    "An aired or vetoed clip does not repeat in the same studio session. Use another indexed clip for the next take. Wait for the configured cooldown (at least one minute); do not lower confidence or bypass the gates to force footage.", "",
    "The deployed account-free replay checks are recorded in RETRIEVAL_VERIFICATION.json. Real live receipt and callback evidence are recorded separately; scripted replay is never presented as live community chat.", "",
  ];
  fs.writeFileSync("docs/TRIGGER_PHRASES.md", lines.join("\n"));
}
