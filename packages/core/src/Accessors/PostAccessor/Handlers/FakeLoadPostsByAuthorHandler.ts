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
    const { status, limit } = request.filter;
    const posts = [...this.state.posts.values()]
      .filter(
        (post) =>
          post.author.kind === "member" &&
          post.author.profileId === request.profileId &&
          (status === null || post.status === status),
      )
      .sort(
        (a, b) =>
          b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id),
      )
      .slice(0, limit ?? undefined);
    return Promise.resolve(new PostsLoadedResponse(request.correlationId, posts));
  }
}
