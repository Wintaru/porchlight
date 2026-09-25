// Every moderator action `ModerationManager` can take (SPEC.md §7). Mirrors the
// `mod_action_kind` enum; the Supabase mod-action accessor asserts the two sets agree
// at compile time. `FileReport` is not here: a report is written by anyone, not a
// moderator action, and lands in `reports` rather than `mod_actions`.
export const MOD_ACTION_KINDS = [
  "approve",
  "approve_mature",
  "reject",
  "hide",
  "remove",
  "lock_thread",
  "suspend",
  "ban",
  "block_anonymous",
  "escalate",
  "mark_trusted",
  "dismiss_reports",
] as const;

export type ModActionKind = (typeof MOD_ACTION_KINDS)[number];
