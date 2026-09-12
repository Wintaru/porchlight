import type { Post } from "../../../Common/Post";
import { ResponseBase } from "../../../Common/ResponseBase";

export class PostLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly post: Post,
  ) {
    super(correlationId);
  }
}
