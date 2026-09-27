import { ResponseBase } from "../../../Common/ResponseBase";

// The store could not be reached or refused. `reason` is for the log, never for a reader.
export class SubscriberAccessFailedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
