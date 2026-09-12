import { ResponseBase } from "../../../Common/ResponseBase";

// The store could not be reached, or the stored value is not one the domain knows.
// `reason` is for the log, never for a member.
export class SiteConfigAccessFailedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
