import type { PostStatus } from "./PostStatus";

// Which of an author's own posts to read (#44): one status or all, and at most how
// many, newest first. The store applies both, so a caller never fetches a whole shelf
// to show part of it.
export interface PostListFilter {
  readonly status: PostStatus | null;
  readonly limit: number | null;
}

export const ALL_POSTS: PostListFilter = { status: null, limit: null };
