import type { NotificationKind } from "../../../Common/NotificationKind";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The same notification for many recipients at once: a new post for every follower
// (#24). One write per batch, not one per recipient.
export class RecordNotificationsRequest extends RequestBase {
  constructor(
    readonly recipientIds: readonly string[],
    readonly kind: NotificationKind,
    readonly target: { readonly postId: string },
    readonly payload: Record<string, unknown>,
    context?: RequestContext,
  ) {
    super(context);
  }
}
