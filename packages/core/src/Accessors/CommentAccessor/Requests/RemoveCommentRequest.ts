import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Hard delete. Answers CommentHasReplies when the no-cascade parent key refuses (D5), so
// the Manager can tombstone instead.
export class RemoveCommentRequest extends RequestBase {
  constructor(
    readonly id: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
