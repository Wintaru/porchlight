import type { AgentLimits } from "../../../Common/AgentLimits";
import { ResponseBase } from "../../../Common/ResponseBase";

export class AgentLimitsLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly limits: AgentLimits,
  ) {
    super(correlationId);
  }
}
