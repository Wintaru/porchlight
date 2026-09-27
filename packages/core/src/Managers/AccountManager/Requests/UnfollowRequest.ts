import type { Actor } from "../../../Common/Actor";
import type { FollowTarget } from "../../../Common/FollowTarget";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The actor stops following an author or a tag (#24). Unfollowing something not
// followed is not an error.
export class UnfollowRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly target: FollowTarget,
    context?: RequestContext,
  ) {
    super(context);
  }
}
