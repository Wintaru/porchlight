import type { IHandler } from "../../../Common/IHandler";
import type { FakeNotificationState } from "../FakeNotificationState";
import type { MarkNotificationsReadRequest } from "../Requests/MarkNotificationsReadRequest";
import { NotificationAccessFailedResponse } from "../Responses/NotificationAccessFailedResponse";
import { NotificationsMarkedReadResponse } from "../Responses/NotificationsMarkedReadResponse";

export class FakeMarkNotificationsReadHandler implements IHandler<
  MarkNotificationsReadRequest,
  NotificationsMarkedReadResponse | NotificationAccessFailedResponse
> {
  constructor(private readonly state: FakeNotificationState) {}

  handle(
    request: MarkNotificationsReadRequest,
  ): Promise<NotificationsMarkedReadResponse | NotificationAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new NotificationAccessFailedResponse(
          request.correlationId,
          "NOTIFICATION_FAKE_RESULT=fail",
        ),
      );
    }
    const { recipientId, notificationId, timestamp } = request;
    let count = 0;
    for (const notification of this.state.forRecipient(recipientId)) {
      if (notification.readAt !== null) {
        continue;
      }
      if (notificationId !== null && notification.id !== notificationId) {
        continue;
      }
      this.state.notifications.set(notification.id, {
        ...notification,
        readAt: timestamp,
      });
      count += 1;
    }
    return Promise.resolve(
      new NotificationsMarkedReadResponse(request.correlationId, count),
    );
  }
}
