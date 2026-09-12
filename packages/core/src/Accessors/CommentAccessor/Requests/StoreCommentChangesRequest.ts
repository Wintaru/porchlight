import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { CommentChanges } from "../CommentChanges";

// Replace a comment's body. Answers CommentNotFound when there is no such row.
export class StoreCommentChangesRequest extends RequestBase {
  constructor(
    readonly id: string,
    readonly changes: CommentChanges,
    context?: RequestContext,
  ) {
    super(context);
  }
}
