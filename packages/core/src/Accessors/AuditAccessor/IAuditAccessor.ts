import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for `audit_log` (SPEC.md §7). `store` writes one entry; `load` reads
// the ListAuditLog query and the locked-item escalation view.
export interface IAuditAccessor {
  store(request: RequestBase): Promise<ResponseBase>;
  load(request: RequestBase): Promise<ResponseBase>;
}
