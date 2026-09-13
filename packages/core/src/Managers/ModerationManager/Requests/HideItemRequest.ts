import type { Actor } from "../../../Common/Actor";
import type { ModerationTarget } from "../../../Common/ModerationTarget";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

export class HideItemRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly target: ModerationTarget,
    readonly reason: string | null,
    context?: RequestContext,
  ) {
    super(context);
  }
}
