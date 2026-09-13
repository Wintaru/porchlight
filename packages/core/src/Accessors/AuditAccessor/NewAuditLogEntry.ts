import type { SubjectKind } from "../../Common/SubjectKind";

// One audit_log write (SPEC.md §7). `actorId` is null for a system-written event (the
// scan pipeline locking an upload, for instance); `subject` is undefined for an event
// with no single target.
export interface NewAuditLogEntry {
  readonly actorId: string | null;
  readonly event: string;
  readonly subject?: { readonly kind: SubjectKind; readonly id: string };
  readonly details: Record<string, unknown>;
}
