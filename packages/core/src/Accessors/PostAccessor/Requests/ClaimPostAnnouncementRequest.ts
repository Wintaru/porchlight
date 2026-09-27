import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Mark the post as announced to its followers, only if nobody has yet (#24). Answers
// PostAnnouncementClaimed to the one caller that set it, PostAlreadyAnnounced to any other.
export class ClaimPostAnnouncementRequest extends RequestBase {
  constructor(
    readonly postId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
