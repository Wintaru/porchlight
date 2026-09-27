import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Public, published posts announced after `since` and up to `until`, oldest first, at
// most `limit`: what one reader email lists (#22). `authorId` narrows it to one author;
// null is the whole site.
export class LoadAnnouncedPostsRequest extends RequestBase {
  constructor(
    readonly since: Date,
    readonly until: Date,
    readonly authorId: string | null,
    readonly limit: number,
    context?: RequestContext,
  ) {
    super(context);
  }
}
