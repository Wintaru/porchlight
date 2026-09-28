import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// How many reports on this post still wait for a moderator (`open` or `escalated`). A
// post with one may not turn private (D27): that would take it out of every
// moderator's reach before they decide it.
export class CountOpenReportsOnPostRequest extends RequestBase {
  constructor(
    readonly postId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
