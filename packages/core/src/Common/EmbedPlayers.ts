// The player addresses a video card may load (#21), one per service. The render engine
// writes a card's address only from these (Engines/ContentRenderEngine/VideoEmbeds.ts);
// the page script that swaps a card for its player checks the address against them
// again, so a card with any other address stays a link.
export const EMBED_PLAYERS = {
  youtube: "https://www.youtube-nocookie.com/embed/",
  vimeo: "https://player.vimeo.com/video/",
} as const;

export const EMBED_PLAYER_PREFIXES: readonly string[] = Object.values(EMBED_PLAYERS);
