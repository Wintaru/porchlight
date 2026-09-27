import type { IHandler } from "../../../Common/IHandler";
import type { FakeFollowState } from "../FakeFollowState";
import type { LoadFollowsByMemberRequest } from "../Requests/LoadFollowsByMemberRequest";
import { FollowAccessFailedResponse } from "../Responses/FollowAccessFailedResponse";
import { FollowsLoadedResponse } from "../Responses/FollowsLoadedResponse";

export class FakeLoadFollowsByMemberHandler implements IHandler<
  LoadFollowsByMemberRequest,
  FollowsLoadedResponse | FollowAccessFailedResponse
> {
  constructor(private readonly state: FakeFollowState) {}

  handle(
    request: LoadFollowsByMemberRequest,
  ): Promise<FollowsLoadedResponse | FollowAccessFailedResponse> {
    const { followerId, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new FollowAccessFailedResponse(correlationId, "FOLLOW_FAKE_RESULT=fail"),
      );
    }
    const follows = [...this.state.follows.values()].filter(
      (follow) => follow.followerId === followerId,
    );
    return Promise.resolve(new FollowsLoadedResponse(correlationId, follows));
  }
}
