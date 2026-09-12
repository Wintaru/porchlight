// What kind of write is being admitted. Names the rate limiter's action column and
// keeps a post's and a comment's counters apart.
export const ANONYMOUS_GUARD_ACTIONS = ["post", "comment"] as const;

export type AnonymousGuardAction = (typeof ANONYMOUS_GUARD_ACTIONS)[number];
