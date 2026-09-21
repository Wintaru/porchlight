import type { AgentActor } from "../../../Common/Actor";
import { ResponseBase } from "../../../Common/ResponseBase";

// The token resolved: the member's profile and the token's grant, ready to pin on
// every request the MCP door builds.
export class AgentActorResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly actor: AgentActor,
  ) {
    super(correlationId);
  }
}
