import { ResponseBase } from "../../../Common/ResponseBase";

// The accessor could not be reached. `reason` is for the log, never for the admin.
export class SiteConfigUnavailableResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
