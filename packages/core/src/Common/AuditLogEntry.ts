import type { SubjectKind } from "./SubjectKind";

// One append-only audit_log row as every layer sees it (SPEC.md §7). `subjectKind` and
// `subjectId` are both null for an event with no single target; the schema's
// `audit_log_subject_pair` CHECK guarantees they are never set independently.
export interface AuditLogEntry {
  readonly id: number;
  readonly actorId: string | null;
  readonly event: string;
  readonly subjectKind: SubjectKind | null;
  readonly subjectId: string | null;
  readonly details: Record<string, unknown>;
  readonly createdAt: Date;
}
