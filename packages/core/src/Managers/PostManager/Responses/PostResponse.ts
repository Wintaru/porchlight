import type { Post } from "../../../Common/Post";
import { ResponseBase } from "../../../Common/ResponseBase";

// The post, after a read or a write.
export class PostResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly post: Post,
  ) {
    super(correlationId);
  }
}
