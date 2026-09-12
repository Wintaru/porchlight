// A post's place in the approval flow (SPEC.md §5). Mirrors the `post_status` enum; the
// Supabase post accessor asserts the two sets agree at compile time.
export const POST_STATUSES = [
  "draft",
  "pending",
  "published",
  "rejected",
  "hidden",
  "removed",
] as const;

export type PostStatus = (typeof POST_STATUSES)[number];
