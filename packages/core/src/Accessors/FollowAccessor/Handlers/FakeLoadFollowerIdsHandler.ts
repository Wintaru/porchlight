import type { IHandler } from "../../../Common/IHandler";
import type { FakeFollowState } from "../FakeFollowState";
import type { LoadFollowerIdsRequest } from "../Requests/LoadFollowerIdsRequest";
import { FollowAccessFailedResponse } from "../Responses/FollowAccessFailedResponse";
import { FollowerIdsLoadedResponse } from "../Responses/FollowerIdsLoadedResponse";

export class FakeLoadFollowerIdsHandler implements IHandler<
  LoadFollowerIdsRequest,
  FollowerIdsLoadedResponse | FollowAccessFailedResponse
> {
  constructor(private readonly state: FakeFollowState) {}

  handle(
    request: LoadFollowerIdsRequest,
  ): Promise<FollowerIdsLoadedResponse | FollowAccessFailedResponse> {
    const { authorId, tagSlugs, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new FollowAccessFailedResponse(correlationId, "FOLLOW_FAKE_RESULT=fail"),
      );
    }
    const ids = new Set<string>();
    for (const follow of this.state.follows.values()) {
      const { target } = follow;
      if (
        (target.kind === "author" && target.profileId === authorId) ||
        (target.kind === "tag" && tagSlugs.includes(target.slug))
      ) {
        ids.add(follow.followerId);
      }
    }
    return Promise.resolve(new FollowerIdsLoadedResponse(correlationId, [...ids]));
  }
}
