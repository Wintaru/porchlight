import type { IHandler } from "../../../Common/IHandler";
import { FakeFollowState } from "../FakeFollowState";
import type { StoreFollowRequest } from "../Requests/StoreFollowRequest";
import { FollowAccessFailedResponse } from "../Responses/FollowAccessFailedResponse";
import { FollowStoredResponse } from "../Responses/FollowStoredResponse";
import type { FollowTargetMissingResponse } from "../Responses/FollowTargetMissingResponse";

type Result =
  FollowStoredResponse | FollowTargetMissingResponse | FollowAccessFailedResponse;

// Mirrors the unique indexes: a repeat is a no-op.
export class FakeStoreFollowHandler implements IHandler<StoreFollowRequest, Result> {
  constructor(private readonly state: FakeFollowState) {}

  handle(request: StoreFollowRequest): Promise<Result> {
    const { followerId, target, correlationId, timestamp } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new FollowAccessFailedResponse(correlationId, "FOLLOW_FAKE_RESULT=fail"),
      );
    }
    const key = FakeFollowState.keyOf(followerId, target);
    if (!this.state.follows.has(key)) {
      this.state.follows.set(key, { followerId, target, createdAt: timestamp });
    }
    return Promise.resolve(new FollowStoredResponse(correlationId));
  }
}
