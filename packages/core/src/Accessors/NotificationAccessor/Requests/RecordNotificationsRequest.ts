import type { NotificationKind } from "../../../Common/NotificationKind";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The same notification for many recipients in one write: every admin and moderator
// (SPEC.md §8), or a new post for every follower in the fake announce (#87; the Supabase
// post store writes those inside `announce_post`). All are stored, or none.
export class RecordNotificationsRequest extends RequestBase {
  constructor(
    readonly recipientIds: readonly string[],
    readonly kind: NotificationKind,
    readonly target: {
      readonly postId?: string | undefined;
      readonly commentId?: string | undefined;
      readonly reportId?: string | undefined;
    },
    readonly payload: Record<string, unknown>,
    context?: RequestContext,
  ) {
    super(context);
  }
}
