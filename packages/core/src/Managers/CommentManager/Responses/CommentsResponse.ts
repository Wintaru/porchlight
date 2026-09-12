import { ResponseBase } from "../../../Common/ResponseBase";
import type { CommentNode } from "../CommentNode";

// The tree: root comments oldest first, each with its replies oldest first.
export class CommentsResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly comments: readonly CommentNode[],
  ) {
    super(correlationId);
  }
}
