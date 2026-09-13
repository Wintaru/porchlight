import type { Actor } from "../../../Common/Actor";
import type { ModerationTarget } from "../../../Common/ModerationTarget";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Flags an item for senior attention without deciding it: the item's own status is
// untouched, and any open reports about it move to `escalated` (SPEC.md §7).
export class EscalateRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly target: ModerationTarget,
    readonly reason: string | null,
    context?: RequestContext,
  ) {
    super(context);
  }
}
