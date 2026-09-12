import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { Reaction } from "../Reaction";

// Add a reaction. Answers ReactionExists when this member already has this kind on this
// item.
export class StoreReactionRequest extends RequestBase {
  constructor(
    readonly reaction: Reaction,
    context?: RequestContext,
  ) {
    super(context);
  }
}
