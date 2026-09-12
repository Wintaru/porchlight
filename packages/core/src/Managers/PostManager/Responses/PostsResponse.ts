import type { Post } from "../../../Common/Post";
import { ResponseBase } from "../../../Common/ResponseBase";

export class PostsResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly posts: readonly Post[],
  ) {
    super(correlationId);
  }
}
