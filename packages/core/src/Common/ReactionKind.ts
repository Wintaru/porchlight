// The small fixed reaction set (D9), the schema's `reaction_kind` enum restated for the
// domain. Names, not glyphs: the Client maps a name to its emoji. toReaction.test.ts
// checks this list against the generated enum constants.
export const REACTION_KINDS = ["heart", "laugh", "wow", "sad", "clap"] as const;

export type ReactionKind = (typeof REACTION_KINDS)[number];
