import type { IHandler } from "../../../Common/IHandler";
import type { FakePostState } from "../FakePostState";
import type { LoadPostRevisionsRequest } from "../Requests/LoadPostRevisionsRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostRevisionsLoadedResponse } from "../Responses/PostRevisionsLoadedResponse";

export class FakeLoadPostRevisionsHandler implements IHandler<
  LoadPostRevisionsRequest,
  PostRevisionsLoadedResponse | PostAccessFailedResponse
> {
  constructor(private readonly state: FakePostState) {}

  handle(
    request: LoadPostRevisionsRequest,
  ): Promise<PostRevisionsLoadedResponse | PostAccessFailedResponse> {
    const { postId, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new PostAccessFailedResponse(correlationId, "POST_FAKE_RESULT=fail"),
      );
    }
    const revisions = this.state.revisions
      .filter((revision) => revision.postId === postId)
      .reverse();
    return Promise.resolve(new PostRevisionsLoadedResponse(correlationId, revisions));
  }
}
