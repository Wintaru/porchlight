import type { IHandler } from "../../../Common/IHandler";
import { FakeFollowState } from "../FakeFollowState";
import type { RemoveFollowRequest } from "../Requests/RemoveFollowRequest";
import { FollowAccessFailedResponse } from "../Responses/FollowAccessFailedResponse";
import { FollowRemovedResponse } from "../Responses/FollowRemovedResponse";

export class FakeRemoveFollowHandler implements IHandler<
  RemoveFollowRequest,
  FollowRemovedResponse | FollowAccessFailedResponse
> {
  constructor(private readonly state: FakeFollowState) {}

  handle(
    request: RemoveFollowRequest,
  ): Promise<FollowRemovedResponse | FollowAccessFailedResponse> {
    const { followerId, target, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new FollowAccessFailedResponse(correlationId, "FOLLOW_FAKE_RESULT=fail"),
      );
    }
    this.state.follows.delete(FakeFollowState.keyOf(followerId, target));
    return Promise.resolve(new FollowRemovedResponse(correlationId));
  }
}
