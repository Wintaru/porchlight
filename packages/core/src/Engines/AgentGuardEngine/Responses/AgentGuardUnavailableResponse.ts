import { ResponseBase } from "../../../Common/ResponseBase";

export class AgentGuardUnavailableResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
