import type { Comment } from "../../../Common/Comment";
import { ResponseBase } from "../../../Common/ResponseBase";

// The row as stored, read back so the caller sees the store's depth and dates.
export class CommentStoredResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly comment: Comment,
  ) {
    super(correlationId);
  }
}
