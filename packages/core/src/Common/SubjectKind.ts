// What an audit_log entry is about (SPEC.md §7). Mirrors the `subject_kind` enum; the
// Supabase audit accessor asserts the two sets agree at compile time. `null` on the
// entry itself (not here) covers an event with no single subject.
export const SUBJECT_KINDS = ["post", "comment", "media"] as const;

export type SubjectKind = (typeof SUBJECT_KINDS)[number];
