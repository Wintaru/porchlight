import type { Actor } from "../../../Common/Actor";
import type { FollowTarget } from "../../../Common/FollowTarget";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The actor follows an author or a tag (#24, D20). Following again changes nothing.
export class FollowRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly target: FollowTarget,
    context?: RequestContext,
  ) {
    super(context);
  }
}
