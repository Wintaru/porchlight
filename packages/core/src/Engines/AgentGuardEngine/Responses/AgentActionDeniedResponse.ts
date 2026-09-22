import { ResponseBase } from "../../../Common/ResponseBase";

// Over the daily cap. Unlike the anonymous guard, this answer names the cap and the
// reset time: the caller is the member's own agent, not a stranger, and a tool that
// knows when to try again does not retry in a loop (SPEC.md §17).
export class AgentActionDeniedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly limit: number,
    readonly resetAt: Date,
  ) {
    super(correlationId);
  }
}
