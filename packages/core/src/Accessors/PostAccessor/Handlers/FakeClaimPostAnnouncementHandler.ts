import type { IHandler } from "../../../Common/IHandler";
import type { FakePostState } from "../FakePostState";
import type { ClaimPostAnnouncementRequest } from "../Requests/ClaimPostAnnouncementRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostAlreadyAnnouncedResponse } from "../Responses/PostAlreadyAnnouncedResponse";
import { PostAnnouncementClaimedResponse } from "../Responses/PostAnnouncementClaimedResponse";

type Result =
  | PostAnnouncementClaimedResponse
  | PostAlreadyAnnouncedResponse
  | PostAccessFailedResponse;

export class FakeClaimPostAnnouncementHandler implements IHandler<
  ClaimPostAnnouncementRequest,
  Result
> {
  constructor(private readonly state: FakePostState) {}

  handle(request: ClaimPostAnnouncementRequest): Promise<Result> {
    const { postId, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new PostAccessFailedResponse(correlationId, "POST_FAKE_RESULT=fail"),
      );
    }
    if (this.state.announced.has(postId)) {
      return Promise.resolve(new PostAlreadyAnnouncedResponse(correlationId));
    }
    this.state.announced.set(postId, request.timestamp);
    return Promise.resolve(new PostAnnouncementClaimedResponse(correlationId));
  }
}
