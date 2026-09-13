import type { Notification } from "../../Common/Notification";

// The fake's `notifications` table, by id. `failing` makes every call answer
// NotificationAccessFailedResponse, for the error path.
export class FakeNotificationState {
  readonly notifications = new Map<string, Notification>();

  constructor(readonly failing = false) {}

  forRecipient(recipientId: string): Notification[] {
    return [...this.notifications.values()].filter(
      (notification) => notification.recipientId === recipientId,
    );
  }
}
