import type { IHandler } from "../../../Common/IHandler";
import type { FakeReactionState } from "../FakeReactionState";
import type { LoadReactionsByProfileRequest } from "../Requests/LoadReactionsByProfileRequest";
import { ReactionAccessFailedResponse } from "../Responses/ReactionAccessFailedResponse";
import { ReactionsLoadedResponse } from "../Responses/ReactionsLoadedResponse";

type Result = ReactionsLoadedResponse | ReactionAccessFailedResponse;

export class FakeLoadReactionsByProfileHandler implements IHandler<
  LoadReactionsByProfileRequest,
  Result
> {
  constructor(private readonly state: FakeReactionState) {}

  handle(request: LoadReactionsByProfileRequest): Promise<Result> {
    if (this.state.failing) {
      return Promise.resolve(
        new ReactionAccessFailedResponse(
          request.correlationId,
          "REACTION_FAKE_RESULT=fail",
        ),
      );
    }
    const reactions = [...this.state.reactions.values()].filter(
      (reaction) => reaction.profileId === request.profileId,
    );
    return Promise.resolve(new ReactionsLoadedResponse(request.correlationId, reactions));
  }
}
