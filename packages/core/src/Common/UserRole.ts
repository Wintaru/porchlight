// The three roles (SPEC.md §4). Mirrors the `user_role` enum in the schema; the Supabase
// profile accessor asserts the two sets agree at compile time.
export const USER_ROLES = ["admin", "moderator", "member"] as const;

export type UserRole = (typeof USER_ROLES)[number];
