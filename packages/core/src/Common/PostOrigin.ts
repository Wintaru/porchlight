// Who wrote a post's first draft (SPEC.md §17, D22). Restates the schema's
// `post_origin` enum, because Common cannot import packages/db; toPost.test.ts checks
// the two lists against each other.
export const POST_ORIGINS = ["editor", "agent"] as const;

export type PostOrigin = (typeof POST_ORIGINS)[number];

export const DEFAULT_POST_ORIGIN: PostOrigin = "editor";
