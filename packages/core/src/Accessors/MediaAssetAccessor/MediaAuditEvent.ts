import type { Json } from "@porchlight/db";

// A system-written audit_log row for a locked verdict (SPEC.md §7): actor_id stays
// null, since no moderator acted — the scan pipeline did. This is the "escalation
// record" issue #10 asks for; #11's escalation view reads audit_log for it rather than
// a second table.
export interface MediaAuditEvent {
  readonly event: string;
  readonly details: Json;
}
