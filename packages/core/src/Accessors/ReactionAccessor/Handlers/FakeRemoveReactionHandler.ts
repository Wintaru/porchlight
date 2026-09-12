import type { IHandler } from "../../../Common/IHandler";
import { FakeReactionState } from "../FakeReactionState";
import type { RemoveReactionRequest } from "../Requests/RemoveReactionRequest";
import { ReactionAccessFailedResponse } from "../Responses/ReactionAccessFailedResponse";
import { ReactionNotFoundResponse } from "../Responses/ReactionNotFoundResponse";
import { ReactionRemovedResponse } from "../Responses/ReactionRemovedResponse";

export class FakeRemoveReactionHandler implements IHandler<
  RemoveReactionRequest,
  ReactionRemovedResponse | ReactionNotFoundResponse | ReactionAccessFailedResponse
> {
  constructor(private readonly state: FakeReactionState) {}

  handle(
    request: RemoveReactionRequest,
  ): Promise<
    ReactionRemovedResponse | ReactionNotFoundResponse | ReactionAccessFailedResponse
  > {
    const { reaction, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new ReactionAccessFailedResponse(correlationId, "REACTION_FAKE_RESULT=fail"),
      );
    }
    return Promise.resolve(
      this.state.reactions.delete(FakeReactionState.keyOf(reaction))
        ? new ReactionRemovedResponse(correlationId)
        : new ReactionNotFoundResponse(correlationId),
    );
  }
}
