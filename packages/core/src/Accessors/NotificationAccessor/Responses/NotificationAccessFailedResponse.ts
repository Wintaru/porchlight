import { ResponseBase } from "../../../Common/ResponseBase";

// `reason` is for the log, never for a member.
export class NotificationAccessFailedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
