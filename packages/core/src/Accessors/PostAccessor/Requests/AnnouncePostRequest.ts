import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Claim the post's one announcement and write a `post.published` notice for each
// follower, in one step (#87). Only a public, published post nobody announced yet is
// claimed. The notices go to the followers of its author and of its tags, each once,
// minus the author and minus anyone who muted or blocked the author. A failed write
// leaves the post unclaimed, so a retry can announce it.
export class AnnouncePostRequest extends RequestBase {
  constructor(
    readonly postId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
