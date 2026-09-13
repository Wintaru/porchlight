import { RequestBase } from "../../../Common/RequestBase";
import type { ModerationTarget } from "../../../Common/ModerationTarget";
import type { RequestContext } from "../../../Common/RequestContext";

// Closes the loop a moderator action leaves open (#11): every `open` report on a
// target moves to `resolved` when a moderator decides the item (approve, reject, hide,
// remove), or to `escalated` for an explicit Escalate action. A target with no open
// reports is a no-op, not an error.
export class ResolveReportsForTargetRequest extends RequestBase {
  constructor(
    readonly target: ModerationTarget,
    readonly status: "resolved" | "escalated",
    readonly resolvedBy: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
