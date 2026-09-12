import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The one rule: does an upload's claimed extension survive a check against the site's
// allowlist and its own actual bytes (SPEC.md §6).
export interface IAttachmentEngine {
  evaluate(request: RequestBase): Promise<ResponseBase>;
}
