import type { IHandler } from "../../../Common/IHandler";
import type { FakePostState } from "../FakePostState";
import type { LoadPostBySlugRequest } from "../Requests/LoadPostBySlugRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostLoadedResponse } from "../Responses/PostLoadedResponse";
import { PostNotFoundResponse } from "../Responses/PostNotFoundResponse";

export class FakeLoadPostBySlugHandler implements IHandler<
  LoadPostBySlugRequest,
  PostLoadedResponse | PostNotFoundResponse | PostAccessFailedResponse
> {
  constructor(private readonly state: FakePostState) {}

  handle(
    request: LoadPostBySlugRequest,
  ): Promise<PostLoadedResponse | PostNotFoundResponse | PostAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new PostAccessFailedResponse(request.correlationId, "POST_FAKE_RESULT=fail"),
      );
    }
    const post = this.state.bySlug(request.slug);
    return Promise.resolve(
      post === undefined
        ? new PostNotFoundResponse(request.correlationId)
        : new PostLoadedResponse(request.correlationId, post),
    );
  }
}
