// A report's place in the moderation flow (SPEC.md §7). Mirrors the `report_status`
// enum; the Supabase report accessor asserts the two sets agree at compile time.
// `open` moves to `resolved` when a moderator decides the item it is about, or to
// `escalated` for an `illegal_content` reason or an explicit Escalate action.
export const REPORT_STATUSES = ["open", "escalated", "resolved", "dismissed"] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];
