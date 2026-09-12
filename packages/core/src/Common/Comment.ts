import type { LiveComment } from "./LiveComment";
import type { TombstoneComment } from "./TombstoneComment";

// A comment as every layer sees it (SPEC.md §5). Two shapes, not one with nullable
// fields: a tombstone has no author and no body, a live comment always has both, and a
// caller narrows on `status`.
export type Comment = LiveComment | TombstoneComment;

// The deepest level a comment can sit at. A reply to a comment at this depth attaches
// beside it, under the same parent, and names who it answers (D10).
export const MAX_COMMENT_DEPTH = 6;
