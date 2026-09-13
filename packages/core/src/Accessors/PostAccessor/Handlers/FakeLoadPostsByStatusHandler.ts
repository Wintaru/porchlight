import type { IHandler } from "../../../Common/IHandler";
import type { FakePostState } from "../FakePostState";
import type { LoadPostsByStatusRequest } from "../Requests/LoadPostsByStatusRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostsLoadedResponse } from "../Responses/PostsLoadedResponse";

export class FakeLoadPostsByStatusHandler implements IHandler<
  LoadPostsByStatusRequest,
  PostsLoadedResponse | PostAccessFailedResponse
> {
  constructor(private readonly state: FakePostState) {}

  handle(
    request: LoadPostsByStatusRequest,
  ): Promise<PostsLoadedResponse | PostAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new PostAccessFailedResponse(request.correlationId, "POST_FAKE_RESULT=fail"),
      );
    }
    const posts = [...this.state.posts.values()]
      .filter((post) => post.status === request.status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return Promise.resolve(new PostsLoadedResponse(request.correlationId, posts));
  }
}
