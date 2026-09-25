import { ResponseBase } from "../../../Common/ResponseBase";

// Storage or the media table could not be reached. `reason` is for the log.
export class MediaPublishUnavailableResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
