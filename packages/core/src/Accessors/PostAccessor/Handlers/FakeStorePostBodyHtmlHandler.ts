import type { IHandler } from "../../../Common/IHandler";
import type { FakePostState } from "../FakePostState";
import type { StorePostBodyHtmlRequest } from "../Requests/StorePostBodyHtmlRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostBodyChangedSinceReadResponse } from "../Responses/PostBodyChangedSinceReadResponse";
import { PostBodyHtmlStoredResponse } from "../Responses/PostBodyHtmlStoredResponse";

export class FakeStorePostBodyHtmlHandler implements IHandler<
  StorePostBodyHtmlRequest,
  PostBodyHtmlStoredResponse | PostBodyChangedSinceReadResponse | PostAccessFailedResponse
> {
  constructor(private readonly state: FakePostState) {}

  handle(
    request: StorePostBodyHtmlRequest,
  ): Promise<
    | PostBodyHtmlStoredResponse
    | PostBodyChangedSinceReadResponse
    | PostAccessFailedResponse
  > {
    if (this.state.failing) {
      return Promise.resolve(
        new PostAccessFailedResponse(request.correlationId, "POST_FAKE_RESULT=fail"),
      );
    }
    const post = this.state.posts.get(request.id);
    if (post?.bodyMd !== request.renderedFrom) {
      return Promise.resolve(new PostBodyChangedSinceReadResponse(request.correlationId));
    }
    // The store's `posts_bump_version` trigger moves the version on every update.
    this.state.posts.set(post.id, {
      ...post,
      bodyHtml: request.bodyHtml,
      version: post.version + 1,
    });
    return Promise.resolve(new PostBodyHtmlStoredResponse(request.correlationId));
  }
}
