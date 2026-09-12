import type { Post } from "../../../Common/Post";
import { ResponseBase } from "../../../Common/ResponseBase";

export class PostStoredResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly post: Post,
  ) {
    super(correlationId);
  }
}
