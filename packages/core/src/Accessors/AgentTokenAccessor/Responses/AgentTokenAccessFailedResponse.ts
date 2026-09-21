import { ResponseBase } from "../../../Common/ResponseBase";

export class AgentTokenAccessFailedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
