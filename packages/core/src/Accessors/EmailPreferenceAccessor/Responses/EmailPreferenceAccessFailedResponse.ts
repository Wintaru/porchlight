import { ResponseBase } from "../../../Common/ResponseBase";

// The store could not be reached or refused. `reason` is for the log, never for a member.
export class EmailPreferenceAccessFailedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
