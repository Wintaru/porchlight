import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for `mod_actions` (SPEC.md §7): append-only. The one read is the
// queue's "which of these are escalated" (#49); the audit UI reads `audit_log` instead.
export interface IModActionAccessor {
  store(request: RequestBase): Promise<ResponseBase>;
  load(request: RequestBase): Promise<ResponseBase>;
}
