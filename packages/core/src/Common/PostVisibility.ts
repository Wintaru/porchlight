// `public` appears in every list; `unlisted` is readable by link only and carries
// `noindex` (SPEC.md §5). Mirrors the `post_visibility` enum.
export const POST_VISIBILITIES = ["public", "unlisted"] as const;

export type PostVisibility = (typeof POST_VISIBILITIES)[number];
