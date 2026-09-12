import type { Comment } from "../../../Common/Comment";
import { ResponseBase } from "../../../Common/ResponseBase";

export class CommentLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly comment: Comment,
  ) {
    super(correlationId);
  }
}
