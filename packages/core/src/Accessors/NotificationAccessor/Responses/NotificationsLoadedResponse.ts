import type { Notification } from "../../../Common/Notification";
import { ResponseBase } from "../../../Common/ResponseBase";

export class NotificationsLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly notifications: readonly Notification[],
  ) {
    super(correlationId);
  }
}
