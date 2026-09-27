import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Public, published posts announced after `since` and up to `until`, oldest first, at
// most `limit`: every post one sweep's reader emails can list (#22).
export class LoadAnnouncedPostsRequest extends RequestBase {
  constructor(
    readonly since: Date,
    readonly until: Date,
    readonly limit: number,
    context?: RequestContext,
  ) {
    super(context);
  }
}
