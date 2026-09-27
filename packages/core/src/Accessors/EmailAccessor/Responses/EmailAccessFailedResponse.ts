import { ResponseBase } from "../../../Common/ResponseBase";

// The vendor could not be reached or refused the messages. `reason` is for the log,
// never for a member.
export class EmailAccessFailedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
