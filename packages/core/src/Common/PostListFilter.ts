import type { PostStatus } from "./PostStatus";

// Which of an author's own posts to read (#44): one status or all, and at most how
// many, newest first. The store applies both, so a caller never fetches a whole shelf
// to show part of it.
export interface PostListFilter {
  readonly status: PostStatus | null;
  readonly limit: number | null;
}

export const ALL_POSTS: PostListFilter = { status: null, limit: null };

// A usable cap: none, or a whole number of 1 or more (#96). 0, a negative number or NaN
// is refused in the core, so the fake store and the real one never have to agree on
// what such a cap means.
export function isPostListLimit(limit: number | null): boolean {
  return limit === null || (Number.isInteger(limit) && limit >= 1);
}
