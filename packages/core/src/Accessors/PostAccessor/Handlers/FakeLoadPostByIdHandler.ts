import type { IHandler } from "../../../Common/IHandler";
import type { FakePostState } from "../FakePostState";
import type { LoadPostByIdRequest } from "../Requests/LoadPostByIdRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostLoadedResponse } from "../Responses/PostLoadedResponse";
import { PostNotFoundResponse } from "../Responses/PostNotFoundResponse";

export class FakeLoadPostByIdHandler implements IHandler<
  LoadPostByIdRequest,
  PostLoadedResponse | PostNotFoundResponse | PostAccessFailedResponse
> {
  constructor(private readonly state: FakePostState) {}

  handle(
    request: LoadPostByIdRequest,
  ): Promise<PostLoadedResponse | PostNotFoundResponse | PostAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new PostAccessFailedResponse(request.correlationId, "POST_FAKE_RESULT=fail"),
      );
    }
    const post = this.state.posts.get(request.id);
    return Promise.resolve(
      post === undefined
        ? new PostNotFoundResponse(request.correlationId)
        : new PostLoadedResponse(request.correlationId, post),
    );
  }
}
