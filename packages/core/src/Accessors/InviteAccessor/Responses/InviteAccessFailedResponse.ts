import { ResponseBase } from "../../../Common/ResponseBase";

// The store could not be reached or refused. `reason` is for the log.
export class InviteAccessFailedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
