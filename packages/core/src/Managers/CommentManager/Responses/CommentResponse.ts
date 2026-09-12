import type { Comment } from "../../../Common/Comment";
import { ResponseBase } from "../../../Common/ResponseBase";

// The comment, after a write.
export class CommentResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly comment: Comment,
  ) {
    super(correlationId);
  }
}
