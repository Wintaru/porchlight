// The three roles (SPEC.md §4). Mirrors the `user_role` enum in the schema; the Supabase
// profile accessor asserts the two sets agree at compile time.
export const USER_ROLES = ["admin", "moderator", "member"] as const;

export type UserRole = (typeof USER_ROLES)[number];

// The roles that work the moderation queue and count as staff everywhere a rule says
// "staff". The SQL `is_staff_role` holds the same set; packages/db/test/mirrors.test.ts
// fails when the two differ.
export const STAFF_ROLES: readonly UserRole[] = ["admin", "moderator"];

export function isStaffRole(role: UserRole): boolean {
  return STAFF_ROLES.includes(role);
}
