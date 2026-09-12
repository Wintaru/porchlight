import { ResponseBase } from "../../../Common/ResponseBase";
import type { PostRejectionReason } from "../PostRejectionReason";

// The draft cannot be stored as sent: the title or a tag has no usable slug.
export class PostRejectedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: PostRejectionReason,
  ) {
    super(correlationId);
  }
}
