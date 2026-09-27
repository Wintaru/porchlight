import type { FollowTarget } from "../../../Common/FollowTarget";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Stop following `target`. Removing a follow that is not there is not an error.
export class RemoveFollowRequest extends RequestBase {
  constructor(
    readonly followerId: string,
    readonly target: FollowTarget,
    context?: RequestContext,
  ) {
    super(context);
  }
}
