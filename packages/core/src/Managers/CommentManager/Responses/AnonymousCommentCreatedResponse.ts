import type { Comment } from "../../../Common/Comment";
import { ResponseBase } from "../../../Common/ResponseBase";

// The comment, plus what the Client must do with the visitor's identity: set `secret`
// as the httpOnly cookie, and show it once as the claim code when `isNewAuthor` (D7).
export class AnonymousCommentCreatedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly comment: Comment,
    readonly secret: string,
    readonly isNewAuthor: boolean,
  ) {
    super(correlationId);
  }
}
