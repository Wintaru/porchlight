import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadReactionsByProfileRequest } from "../Requests/LoadReactionsByProfileRequest";
import { ReactionAccessFailedResponse } from "../Responses/ReactionAccessFailedResponse";
import { ReactionsLoadedResponse } from "../Responses/ReactionsLoadedResponse";
import { REACTION_COLUMNS, toReaction } from "../toReaction";

type Result = ReactionsLoadedResponse | ReactionAccessFailedResponse;

export class SupabaseLoadReactionsByProfileHandler implements IHandler<
  LoadReactionsByProfileRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: LoadReactionsByProfileRequest): Promise<Result> {
    const { data, error } = await this.db
      .from("reactions")
      .select(REACTION_COLUMNS)
      .eq("profile_id", request.profileId);
    if (error) {
      return new ReactionAccessFailedResponse(request.correlationId, error.message);
    }
    return new ReactionsLoadedResponse(request.correlationId, data.map(toReaction));
  }
}
