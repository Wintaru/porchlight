// The Postgres error code `refuse_delete_before_retain_until` raises (SPEC.md §7): a
// locked item's own trigger, not something this accessor decides. The Manager checks
// `scanStatus` before ever calling remove, so this is defense in depth for a race, not
// the primary path.
export const CHECK_VIOLATION = "23514";

export function isRetained(error: { readonly code: string }): boolean {
  return error.code === CHECK_VIOLATION;
}
