import type { IHandler } from "../../../Common/IHandler";
import type { FakePostState } from "../FakePostState";
import type { RemovePostRequest } from "../Requests/RemovePostRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostNotFoundResponse } from "../Responses/PostNotFoundResponse";
import { PostRemovedResponse } from "../Responses/PostRemovedResponse";

export class FakeRemovePostHandler implements IHandler<
  RemovePostRequest,
  PostRemovedResponse | PostNotFoundResponse | PostAccessFailedResponse
> {
  constructor(private readonly state: FakePostState) {}

  handle(
    request: RemovePostRequest,
  ): Promise<PostRemovedResponse | PostNotFoundResponse | PostAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new PostAccessFailedResponse(request.correlationId, "POST_FAKE_RESULT=fail"),
      );
    }
    return Promise.resolve(
      this.state.posts.delete(request.id)
        ? new PostRemovedResponse(request.correlationId)
        : new PostNotFoundResponse(request.correlationId),
    );
  }
}
