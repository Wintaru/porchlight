// `public` appears in every list; `unlisted` is readable by link only and carries
// `noindex` (SPEC.md §5). `private` is the author's alone (D27, #101): nobody else reads
// it, staff included, and it never waits in the moderation queue. Mirrors the
// `post_visibility` enum.
export const POST_VISIBILITIES = ["public", "unlisted", "private"] as const;

export type PostVisibility = (typeof POST_VISIBILITIES)[number];
