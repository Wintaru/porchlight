import { ResponseBase } from "../../../Common/ResponseBase";

// The store could not be reached. `reason` is for the log, never for a visitor.
export class AnonymousAuthorAccessFailedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
