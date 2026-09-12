// The schema's `comment_status` enum restated for the domain (SPEC.md §5). `pending`
// waits in the queue, `visible` is up, `rejected`/`hidden`/`removed` are moderation
// outcomes (#11), `tombstone` is an erased comment that keeps its replies in place (D5).
// toComment.test.ts checks this list against the generated enum constants.
export const COMMENT_STATUSES = [
  "pending",
  "visible",
  "rejected",
  "hidden",
  "removed",
  "tombstone",
] as const;

export type CommentStatus = (typeof COMMENT_STATUSES)[number];
