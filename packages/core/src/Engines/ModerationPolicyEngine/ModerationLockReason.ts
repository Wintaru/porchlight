// Why a locked verdict fired, kept for the audit_log entry the Manager writes — never
// shown to the uploader, who only ever sees a plain refusal (SPEC.md §7, issue #31).
export const MODERATION_LOCK_REASONS = [
  "hash-match",
  "minors-signal",
  "severity",
] as const;

export type ModerationLockReason = (typeof MODERATION_LOCK_REASONS)[number];
