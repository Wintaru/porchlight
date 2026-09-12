import type { ReactionKind } from "@/read-model/reactions";

// The glyph and the button label for each reaction name (D9). The schema stores the
// name, so a glyph can change without a migration. Keyed by the whole union: a new
// kind without a glyph here is a type error.
export const REACTION_GLYPHS: Readonly<
  Record<ReactionKind, { readonly glyph: string; readonly label: string }>
> = {
  heart: { glyph: "❤️", label: "Heart" },
  laugh: { glyph: "😄", label: "Laugh" },
  wow: { glyph: "😮", label: "Wow" },
  sad: { glyph: "😢", label: "Sad" },
  clap: { glyph: "👏", label: "Clap" },
};
