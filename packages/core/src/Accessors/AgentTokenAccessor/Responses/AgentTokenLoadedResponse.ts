import type { AgentToken } from "../../../Common/AgentToken";
import { ResponseBase } from "../../../Common/ResponseBase";

export class AgentTokenLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly token: AgentToken,
  ) {
    super(correlationId);
  }
}
