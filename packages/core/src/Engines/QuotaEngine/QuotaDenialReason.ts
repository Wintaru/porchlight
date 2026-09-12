// Why an upload did not fit inside its cap (SPEC.md §6, §4). `file-count-cap` only
// applies to an anonymous author's fixed 3-file limit (D15); a member has no such count,
// only a byte total.
export const QUOTA_DENIAL_REASONS = [
  "file-too-large",
  "account-cap",
  "file-count-cap",
] as const;

export type QuotaDenialReason = (typeof QUOTA_DENIAL_REASONS)[number];
