// How often a member's unread notifications arrive as one email (SPEC.md §8, D14, #22).
// Mirrors the `digest_schedule` enum; toMemberEmailClaim.test.ts checks the two agree.
export const DIGEST_SCHEDULES = ["off", "hourly", "daily"] as const;

export type DigestSchedule = (typeof DIGEST_SCHEDULES)[number];
