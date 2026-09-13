import { RequestBase } from "../../../Common/RequestBase";
import type { NotificationKind } from "../../../Common/NotificationKind";
import type { RequestContext } from "../../../Common/RequestContext";

// One notification for one recipient (SPEC.md §8). `postId`/`commentId`/`reportId` name
// what it is about; a caller with no target of its own (there is none today) leaves all
// three null. `payload` carries kind-specific display data such as a rejection reason.
export class RecordNotificationRequest extends RequestBase {
  constructor(
    readonly recipientId: string,
    readonly kind: NotificationKind,
    readonly target: {
      readonly postId?: string | null | undefined;
      readonly commentId?: string | null | undefined;
      readonly reportId?: string | null | undefined;
    },
    readonly payload: Record<string, unknown>,
    context?: RequestContext,
  ) {
    super(context);
  }
}
