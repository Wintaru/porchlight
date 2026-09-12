import { ResponseBase } from "../../../Common/ResponseBase";

export class RateLimitAccessFailedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
