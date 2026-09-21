import type { AgentToken } from "../../../Common/AgentToken";
import { ResponseBase } from "../../../Common/ResponseBase";

export class AgentTokensLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly tokens: readonly AgentToken[],
  ) {
    super(correlationId);
  }
}
