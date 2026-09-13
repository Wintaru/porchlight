import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// MarkRead (SPEC.md §8). A null `notificationId` marks every unread notification for
// the recipient; scoped to `recipientId` either way, so a member can never mark
// somebody else's notification read.
export class MarkNotificationsReadRequest extends RequestBase {
  constructor(
    readonly recipientId: string,
    readonly notificationId: string | null,
    context?: RequestContext,
  ) {
    super(context);
  }
}
