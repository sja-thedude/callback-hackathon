export function buildScenarios(library) {
  return library.clips.slice(0, 6).map((clip, index) => ({
    label: clip.title,
    description: `A scripted conversation recalls ${clip.broadcaster}’s own clip.`,
    clip: index,
    messages: [
      "evening everyone, how is the stream going?",
      "wait, that feels familiar",
      `does anyone remember “${clip.title}”?`,
      `that was the ${clip.title} moment`,
      `I remember ${clip.title} from this channel`,
      `someone find the clip: ${clip.title}`,
      `${clip.title} — chat remembers`,
      `bring back ${clip.title}`,
      `the original ${clip.title} clip`,
    ],
  }));
}
