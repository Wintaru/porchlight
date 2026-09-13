import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A member's own notifications for the bell (SPEC.md §8). There is no selector: the
// recipient is always the caller, never a profile id an actor could substitute.
export class ListNotificationsRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    context?: RequestContext,
  ) {
    super(context);
  }
}
