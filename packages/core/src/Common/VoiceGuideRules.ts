// The phrases every voice guide bans (SPEC.md §17): the stock wording that marks a
// draft as machine-written. A member adds their own in the guide's text; this list is
// appended to every guide and cannot be removed from it.
export const DEFAULT_BANNED_PHRASES = [
  "delve",
  "in today's fast-paced world",
  "it's important to note",
  "it's worth noting",
  "in conclusion",
  "a testament to",
  "navigate the complexities",
  "unlock the power of",
  "game-changer",
  "tapestry",
  "embark on a journey",
  "let's dive in",
  "at the end of the day",
  "without further ado",
] as const;

// How many hand-written posts go with the guide as samples.
export const VOICE_SAMPLE_COUNT = 5;

// The longest guide the store takes (`profiles_voice_guide_length`).
export const VOICE_GUIDE_MAX_LENGTH = 20_000;
