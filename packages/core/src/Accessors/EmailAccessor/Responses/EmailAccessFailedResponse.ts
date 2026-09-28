import { ResponseBase } from "../../../Common/ResponseBase";

// The vendor could not be reached or refused the messages. `reason` is for the log,
// never for a member. `sent` counts the messages from the start of the request that
// went out before the failure (#86): a caller puts back only the ones after them. It
// has no default, so a new sender must say how many went out.
export class EmailAccessFailedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
    readonly sent: number,
  ) {
    super(correlationId);
  }
}
