import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// Pure business logic (SPEC.md §7): turns a hash-match result and an optional image
// classification into clear | flagged | locked. No I/O, no site_config lookups of its
// own — the Manager reads the thresholds and hands them in on the request.
export interface IModerationPolicyEngine {
  evaluate(request: RequestBase): Promise<ResponseBase>;
}
