import type { Actor } from "../../../Common/Actor";
import type { ModerationTarget } from "../../../Common/ModerationTarget";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A moderator looked at a reported item and found nothing to act on (#40): the item is
// untouched, and every open or escalated report about it moves to `dismissed`.
export class DismissReportsRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly target: ModerationTarget,
    readonly reason: string | null,
    context?: RequestContext,
  ) {
    super(context);
  }
}
