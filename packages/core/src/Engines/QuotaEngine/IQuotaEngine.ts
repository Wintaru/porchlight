import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The one rule: does one more file of a given size fit inside the subject's cap
// (SPEC.md §6, §4). Never asked about an admin, who has no quota (D16).
export interface IQuotaEngine {
  evaluate(request: RequestBase): Promise<ResponseBase>;
}
