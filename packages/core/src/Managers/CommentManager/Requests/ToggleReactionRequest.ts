import type { Actor } from "../../../Common/Actor";
import type { ReactionKind } from "../../../Common/ReactionKind";
import type { ReactionTarget } from "../../../Common/ReactionTarget";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A member adds a reaction to a post or a comment, or takes it back when it is already
// there (D9).
export class ToggleReactionRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly target: ReactionTarget,
    readonly kind: ReactionKind,
    context?: RequestContext,
  ) {
    super(context);
  }
}
