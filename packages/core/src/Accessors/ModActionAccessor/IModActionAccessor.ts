import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for `mod_actions` (SPEC.md §7): append-only, write-only from here —
// nothing in the issue's query list (ListQueue, ListReports, ListAuditLog) reads this
// table back; the escalation view and audit UI read `audit_log` instead.
export interface IModActionAccessor {
  store(request: RequestBase): Promise<ResponseBase>;
}
