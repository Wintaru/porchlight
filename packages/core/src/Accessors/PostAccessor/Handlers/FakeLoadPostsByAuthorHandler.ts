import type { IHandler } from "../../../Common/IHandler";
import type { FakePostState } from "../FakePostState";
import type { LoadPostsByAuthorRequest } from "../Requests/LoadPostsByAuthorRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostsLoadedResponse } from "../Responses/PostsLoadedResponse";

export class FakeLoadPostsByAuthorHandler implements IHandler<
  LoadPostsByAuthorRequest,
  PostsLoadedResponse | PostAccessFailedResponse
> {
  constructor(private readonly state: FakePostState) {}

  handle(
    request: LoadPostsByAuthorRequest,
  ): Promise<PostsLoadedResponse | PostAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new PostAccessFailedResponse(request.correlationId, "POST_FAKE_RESULT=fail"),
      );
    }
    const posts = [...this.state.posts.values()]
      .filter(
        (post) =>
          post.author.kind === "member" && post.author.profileId === request.profileId,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return Promise.resolve(new PostsLoadedResponse(request.correlationId, posts));
  }
}
