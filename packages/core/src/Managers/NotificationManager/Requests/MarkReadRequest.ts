import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Marks one of the caller's own notifications read, or every unread one when
// `notificationId` is null (SPEC.md §8).
export class MarkReadRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly notificationId: string | null,
    context?: RequestContext,
  ) {
    super(context);
  }
}
