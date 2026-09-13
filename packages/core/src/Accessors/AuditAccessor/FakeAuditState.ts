import type { AuditLogEntry } from "../../Common/AuditLogEntry";

// The fake's `audit_log` table, in insertion order. `failing` makes every call answer
// AuditAccessFailedResponse, for the error path.
export class FakeAuditState {
  readonly entries: AuditLogEntry[] = [];
  private nextId = 1;

  constructor(readonly failing = false) {}

  nextEntryId(): number {
    const id = this.nextId;
    this.nextId += 1;
    return id;
  }
}
