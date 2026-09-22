import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The daily caps on one agent token (SPEC.md §17, D22). `evaluate` counts the action
// and answers whether it may proceed.
export interface IAgentGuardEngine {
  evaluate(request: RequestBase): Promise<ResponseBase>;
}
