import type { Json, Tables } from "@porchlight/db";

import type { AuditLogEntry } from "../../Common/AuditLogEntry";

// Never `select *`: the shape here is the one the mapper below expects.
export const AUDIT_LOG_COLUMNS =
  "id, actor_id, event, subject_kind, subject_id, details, created_at";

export type AuditLogRow = Pick<
  Tables<"audit_log">,
  "id" | "actor_id" | "event" | "subject_kind" | "subject_id" | "details" | "created_at"
>;

// toAuditLogEntry's subject_kind assignment proves every schema value is in the domain
// union; toAuditLogEntry.test.ts checks the other direction against the generated enum.
export function toAuditLogEntry(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    actorId: row.actor_id,
    event: row.event,
    subjectKind: row.subject_kind,
    subjectId: row.subject_id,
    details: toDetails(row.details),
    createdAt: new Date(row.created_at),
  };
}

// `details` is `jsonb not null default '{}'`, always an object in practice; this only
// narrows the generated `Json` type, not a runtime check the schema could fail.
function toDetails(details: Json): Record<string, unknown> {
  return typeof details === "object" && details !== null && !Array.isArray(details)
    ? details
    : {};
}
