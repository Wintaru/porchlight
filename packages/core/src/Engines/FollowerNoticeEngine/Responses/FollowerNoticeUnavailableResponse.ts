import { ResponseBase } from "../../../Common/ResponseBase";

// A follow, block or notification store could not be reached. `reason` is for the log.
export class FollowerNoticeUnavailableResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
