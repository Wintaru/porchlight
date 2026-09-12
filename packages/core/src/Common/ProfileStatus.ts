// The account's standing. Only `active` may act. Mirrors the `profile_status` enum.
export const PROFILE_STATUSES = ["active", "suspended", "banned", "erased"] as const;

export type ProfileStatus = (typeof PROFILE_STATUSES)[number];
