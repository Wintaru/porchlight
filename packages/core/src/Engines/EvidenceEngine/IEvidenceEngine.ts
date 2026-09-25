import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// Turns a created post or comment and the request it came from into its evidence
// envelope (SPEC.md §7, #61): the salted address hash, the raw address for the region's
// window, the agent, the Turnstile result and a hash of the text, stored as one
// `submission_evidence` row.
export interface IEvidenceEngine {
  transform(request: RequestBase): Promise<ResponseBase>;
}
