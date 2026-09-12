import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { Reaction } from "../Reaction";

// Take a reaction back. Answers ReactionNotFound when there was none.
export class RemoveReactionRequest extends RequestBase {
  constructor(
    readonly reaction: Reaction,
    context?: RequestContext,
  ) {
    super(context);
  }
}
