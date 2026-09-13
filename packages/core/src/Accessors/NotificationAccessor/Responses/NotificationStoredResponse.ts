import type { Notification } from "../../../Common/Notification";
import { ResponseBase } from "../../../Common/ResponseBase";

export class NotificationStoredResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly notification: Notification,
  ) {
    super(correlationId);
  }
}
