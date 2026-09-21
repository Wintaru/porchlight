import type { AgentsPolicy } from "../../../Common/AgentsPolicy";
import { ResponseBase } from "../../../Common/ResponseBase";

export class AgentsPolicyResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly policy: AgentsPolicy,
  ) {
    super(correlationId);
  }
}
