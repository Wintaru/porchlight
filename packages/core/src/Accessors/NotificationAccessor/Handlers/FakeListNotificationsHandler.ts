import type { IHandler } from "../../../Common/IHandler";
import type { FakeNotificationState } from "../FakeNotificationState";
import type { ListNotificationsRequest } from "../Requests/ListNotificationsRequest";
import { NotificationAccessFailedResponse } from "../Responses/NotificationAccessFailedResponse";
import { NotificationsLoadedResponse } from "../Responses/NotificationsLoadedResponse";

export class FakeListNotificationsHandler implements IHandler<
  ListNotificationsRequest,
  NotificationsLoadedResponse | NotificationAccessFailedResponse
> {
  constructor(private readonly state: FakeNotificationState) {}

  handle(
    request: ListNotificationsRequest,
  ): Promise<NotificationsLoadedResponse | NotificationAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new NotificationAccessFailedResponse(
          request.correlationId,
          "NOTIFICATION_FAKE_RESULT=fail",
        ),
      );
    }
    const notifications = this.state
      .forRecipient(request.recipientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return Promise.resolve(
      new NotificationsLoadedResponse(request.correlationId, notifications),
    );
  }
}
