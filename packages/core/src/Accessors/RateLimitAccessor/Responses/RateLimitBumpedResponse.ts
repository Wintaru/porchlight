import { ResponseBase } from "../../../Common/ResponseBase";

// The counter's new value, including this submission.
export class RateLimitBumpedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly count: number,
  ) {
    super(correlationId);
  }
}
