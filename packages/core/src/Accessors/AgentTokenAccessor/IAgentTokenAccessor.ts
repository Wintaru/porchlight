import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for the `agent_tokens` table (SPEC.md §17, D22). `store` mints,
// revokes and touches a token; `load` finds one by hash or lists a member's own.
export interface IAgentTokenAccessor {
  store(request: RequestBase): Promise<ResponseBase>;
  load(request: RequestBase): Promise<ResponseBase>;
}
