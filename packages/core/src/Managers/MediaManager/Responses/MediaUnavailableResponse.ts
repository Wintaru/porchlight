import { ResponseBase } from "../../../Common/ResponseBase";

// Turns any response a handler did not expect from a lower layer into the one failure
// the Client knows, with the reason for the log.
export class MediaUnavailableResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
