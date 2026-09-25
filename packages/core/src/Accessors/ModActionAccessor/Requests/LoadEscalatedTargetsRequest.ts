import type { ModerationTarget } from "../../../Common/ModerationTarget";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Which of these posts and comments a moderator has escalated (SPEC.md §7): the queue
// marks them, since an escalated item stays pending until someone senior decides it.
export class LoadEscalatedTargetsRequest extends RequestBase {
  constructor(
    readonly targets: readonly ModerationTarget[],
    context?: RequestContext,
  ) {
    super(context);
  }
}
