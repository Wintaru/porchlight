import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// ListNotifications for the bell (SPEC.md §8). Newest first, like every other feed in
// the app.
export class ListNotificationsRequest extends RequestBase {
  constructor(
    readonly recipientId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
