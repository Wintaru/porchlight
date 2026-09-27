import type { Post } from "../../../Common/Post";
import type { PostRevision } from "../../../Common/PostRevision";
import { ResponseBase } from "../../../Common/ResponseBase";

export class PostRevisionsResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly post: Post,
    readonly revisions: readonly PostRevision[],
  ) {
    super(correlationId);
  }
}
