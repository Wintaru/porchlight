// What kind of write is being admitted. Names the rate limiter's action column and
// keeps a post's, a comment's, a media upload's and a report's counters apart.
export const ANONYMOUS_GUARD_ACTIONS = ["post", "comment", "media", "report"] as const;

export type AnonymousGuardAction = (typeof ANONYMOUS_GUARD_ACTIONS)[number];
