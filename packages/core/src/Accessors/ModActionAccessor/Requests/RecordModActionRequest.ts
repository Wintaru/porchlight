import { RequestBase } from "../../../Common/RequestBase";
import type { ModActionKind } from "../../../Common/ModActionKind";
import type { ModActionTarget } from "../../../Common/ModActionTarget";
import type { RequestContext } from "../../../Common/RequestContext";

// Every ModerationManager action writes one of these (SPEC.md §7).
export class RecordModActionRequest extends RequestBase {
  constructor(
    readonly actorId: string,
    readonly action: ModActionKind,
    readonly target: ModActionTarget,
    readonly reason: string | null,
    context?: RequestContext,
  ) {
    super(context);
  }
}
