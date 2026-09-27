import type { IHandler } from "../../../Common/IHandler";
import type { FakePostState } from "../FakePostState";
import type { StorePostBodyHtmlRequest } from "../Requests/StorePostBodyHtmlRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostBodyHtmlStoredResponse } from "../Responses/PostBodyHtmlStoredResponse";

export class FakeStorePostBodyHtmlHandler implements IHandler<
  StorePostBodyHtmlRequest,
  PostBodyHtmlStoredResponse | PostAccessFailedResponse
> {
  constructor(private readonly state: FakePostState) {}

  handle(
    request: StorePostBodyHtmlRequest,
  ): Promise<PostBodyHtmlStoredResponse | PostAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new PostAccessFailedResponse(request.correlationId, "POST_FAKE_RESULT=fail"),
      );
    }
    const post = this.state.posts.get(request.id);
    if (post?.bodyMd === request.renderedFrom) {
      this.state.posts.set(post.id, { ...post, bodyHtml: request.bodyHtml });
    }
    return Promise.resolve(new PostBodyHtmlStoredResponse(request.correlationId));
  }
}
