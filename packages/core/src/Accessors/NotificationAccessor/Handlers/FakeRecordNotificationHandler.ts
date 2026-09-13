import type { Notification } from "../../../Common/Notification";
import type { IHandler } from "../../../Common/IHandler";
import type { FakeNotificationState } from "../FakeNotificationState";
import type { RecordNotificationRequest } from "../Requests/RecordNotificationRequest";
import { NotificationAccessFailedResponse } from "../Responses/NotificationAccessFailedResponse";
import { NotificationStoredResponse } from "../Responses/NotificationStoredResponse";

export class FakeRecordNotificationHandler implements IHandler<
  RecordNotificationRequest,
  NotificationStoredResponse | NotificationAccessFailedResponse
> {
  constructor(private readonly state: FakeNotificationState) {}

  handle(
    request: RecordNotificationRequest,
  ): Promise<NotificationStoredResponse | NotificationAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new NotificationAccessFailedResponse(
          request.correlationId,
          "NOTIFICATION_FAKE_RESULT=fail",
        ),
      );
    }
    const { recipientId, kind, target, payload, timestamp } = request;
    const notification: Notification = {
      id: globalThis.crypto.randomUUID(),
      recipientId,
      kind,
      postId: target.postId ?? null,
      commentId: target.commentId ?? null,
      reportId: target.reportId ?? null,
      payload,
      readAt: null,
      createdAt: timestamp,
    };
    this.state.notifications.set(notification.id, notification);
    return Promise.resolve(
      new NotificationStoredResponse(request.correlationId, notification),
    );
  }
}
