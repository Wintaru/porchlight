// What a notification is about (SPEC.md §8). Mirrors the `notification_kind` enum; the
// Supabase notification accessor asserts the two sets agree at compile time.
export const NOTIFICATION_KINDS = [
  "queue.pending",
  "reply.created",
  "item.approved",
  "item.rejected",
  "report.filed",
  "mod.action",
  // A followed author or tag has a new post out (#24, D20).
  "post.published",
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];
