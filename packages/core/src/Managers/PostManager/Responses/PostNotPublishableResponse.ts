import type { PostStatus } from "../../../Common/PostStatus";
import { ResponseBase } from "../../../Common/ResponseBase";

// A rejected, hidden or removed post does not go back up by its author. A moderator
// decides that (#11).
export class PostNotPublishableResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly status: PostStatus,
  ) {
    super(correlationId);
  }
}
