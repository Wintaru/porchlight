import type { AnnouncedPost } from "../../../Common/AnnouncedPost";
import { ResponseBase } from "../../../Common/ResponseBase";

export class AnnouncedPostsLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly posts: readonly AnnouncedPost[],
  ) {
    super(correlationId);
  }
}
