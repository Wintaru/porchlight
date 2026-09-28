import { ResponseBase } from "../../../Common/ResponseBase";

// The post store could not announce the post. `reason` is for the log, which the
// engine already wrote.
export class FollowerNoticeUnavailableResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
