import { ResponseBase } from "../../../Common/ResponseBase";
import type { CommentRejectionReason } from "../CommentRejectionReason";

// The comment cannot be stored as sent.
export class CommentRejectedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: CommentRejectionReason,
  ) {
    super(correlationId);
  }
}
