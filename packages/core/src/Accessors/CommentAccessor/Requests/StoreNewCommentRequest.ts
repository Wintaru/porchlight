import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { NewComment } from "../NewComment";

// Insert a comment. The store derives `depth` from `parentId` and stamps the dates.
export class StoreNewCommentRequest extends RequestBase {
  constructor(
    readonly comment: NewComment,
    context?: RequestContext,
  ) {
    super(context);
  }
}
