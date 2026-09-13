// Why a post or comment was reported (SPEC.md §7). Mirrors the `report_reason` enum;
// the Supabase report accessor asserts the two sets agree at compile time.
// `illegal_content` escalates at once instead of waiting in the open queue.
export const REPORT_REASONS = [
  "harassment",
  "hate",
  "spam",
  "sexual_content",
  "violence",
  "self_harm",
  "copyright",
  "other",
  "illegal_content",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];
