import type { IHandler } from "../../../Common/IHandler";
import { FakeReactionState } from "../FakeReactionState";
import type { StoreReactionRequest } from "../Requests/StoreReactionRequest";
import { ReactionAccessFailedResponse } from "../Responses/ReactionAccessFailedResponse";
import { ReactionExistsResponse } from "../Responses/ReactionExistsResponse";
import { ReactionStoredResponse } from "../Responses/ReactionStoredResponse";

// Mirrors the per-member unique constraint.
export class FakeStoreReactionHandler implements IHandler<
  StoreReactionRequest,
  ReactionStoredResponse | ReactionExistsResponse | ReactionAccessFailedResponse
> {
  constructor(private readonly state: FakeReactionState) {}

  handle(
    request: StoreReactionRequest,
  ): Promise<
    ReactionStoredResponse | ReactionExistsResponse | ReactionAccessFailedResponse
  > {
    const { reaction, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new ReactionAccessFailedResponse(correlationId, "REACTION_FAKE_RESULT=fail"),
      );
    }
    const key = FakeReactionState.keyOf(reaction);
    if (this.state.reactions.has(key)) {
      return Promise.resolve(new ReactionExistsResponse(correlationId));
    }
    this.state.reactions.add(key);
    return Promise.resolve(new ReactionStoredResponse(correlationId));
  }
}
