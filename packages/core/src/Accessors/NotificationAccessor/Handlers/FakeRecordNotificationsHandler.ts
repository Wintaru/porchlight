import type { IHandler } from "../../../Common/IHandler";
import type { FakeNotificationState } from "../FakeNotificationState";
import type { RecordNotificationsRequest } from "../Requests/RecordNotificationsRequest";
import { NotificationAccessFailedResponse } from "../Responses/NotificationAccessFailedResponse";
import { NotificationsRecordedResponse } from "../Responses/NotificationsRecordedResponse";

export class FakeRecordNotificationsHandler implements IHandler<
  RecordNotificationsRequest,
  NotificationsRecordedResponse | NotificationAccessFailedResponse
> {
  constructor(private readonly state: FakeNotificationState) {}

  handle(
    request: RecordNotificationsRequest,
  ): Promise<NotificationsRecordedResponse | NotificationAccessFailedResponse> {
    const { recipientIds, kind, target, payload, correlationId, timestamp } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new NotificationAccessFailedResponse(
          correlationId,
          "NOTIFICATION_FAKE_RESULT=fail",
        ),
      );
    }
    for (const recipientId of recipientIds) {
      const id = globalThis.crypto.randomUUID();
      this.state.notifications.set(id, {
        id,
        recipientId,
        kind,
        postId: target.postId ?? null,
        commentId: target.commentId ?? null,
        reportId: target.reportId ?? null,
        payload,
        readAt: null,
        createdAt: timestamp,
      });
    }
    return Promise.resolve(
      new NotificationsRecordedResponse(correlationId, recipientIds.length),
    );
  }
}
