export const embeddingText = (clip) => `${clip.title} ${clip.category}`;

export function normalizeClip(clip, games, owner) {
  if (clip.broadcaster_id !== owner.id)
    throw new Error("Clip ownership does not match the selected broadcaster.");
  return {
    id: clip.id,
    title: clip.title,
    category: games[clip.game_id] || "Uncategorized",
    gameId: clip.game_id,
    date: clip.created_at,
    views: clip.view_count,
    duration: clip.duration,
    thumbnail: clip.thumbnail_url,
    url: clip.url,
    broadcaster: owner.name || owner.display_name,
    broadcasterId: clip.broadcaster_id,
    creator: clip.creator_name,
  };
}
