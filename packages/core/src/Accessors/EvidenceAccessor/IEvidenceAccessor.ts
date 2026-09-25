import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for `submission_evidence` rows about text (SPEC.md §7, #61). Write
// only: nothing in the app reads evidence back; an admin or a legal request does.
export interface IEvidenceAccessor {
  store(request: RequestBase): Promise<ResponseBase>;
}
