import type { FollowTarget } from "../../../Common/FollowTarget";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Follow `target`. Following it again is not an error: the answer is the same.
export class StoreFollowRequest extends RequestBase {
  constructor(
    readonly followerId: string,
    readonly target: FollowTarget,
    context?: RequestContext,
  ) {
    super(context);
  }
}
