import type { Post } from "../../../Common/Post";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// `post` is out now (its status just became `published`). Tell its followers.
export class NotifyFollowersRequest extends RequestBase {
  constructor(
    readonly post: Post,
    context?: RequestContext,
  ) {
    super(context);
  }
}
