import type { IHandler } from "../../../Common/IHandler";
import type { Post } from "../../../Common/Post";
import type { FakePostState } from "../FakePostState";
import type { LoadPostsByIdsRequest } from "../Requests/LoadPostsByIdsRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostsLoadedResponse } from "../Responses/PostsLoadedResponse";

export class FakeLoadPostsByIdsHandler implements IHandler<
  LoadPostsByIdsRequest,
  PostsLoadedResponse | PostAccessFailedResponse
> {
  constructor(private readonly state: FakePostState) {}

  handle(
    request: LoadPostsByIdsRequest,
  ): Promise<PostsLoadedResponse | PostAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new PostAccessFailedResponse(request.correlationId, "POST_FAKE_RESULT=fail"),
      );
    }
    const posts = [...new Set(request.ids)].flatMap((id): Post[] => {
      const post = this.state.posts.get(id);
      return post === undefined ? [] : [post];
    });
    return Promise.resolve(new PostsLoadedResponse(request.correlationId, posts));
  }
}
