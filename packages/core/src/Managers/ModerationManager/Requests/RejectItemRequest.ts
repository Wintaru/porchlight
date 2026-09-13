import type { Actor } from "../../../Common/Actor";
import type { ModerationTarget } from "../../../Common/ModerationTarget";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// `reason` is required (SPEC.md §7); an empty or whitespace-only string answers
// ReasonRequiredResponse the same as a missing one.
export class RejectItemRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly target: ModerationTarget,
    readonly reason: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
