import type { NotificationKind } from "../../../Common/NotificationKind";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The same notification for many recipients at once: a new post for every follower
// (#24). Only the fake store answers it, for the fake announce (#87): the Supabase
// post store writes these notices inside `announce_post`.
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
