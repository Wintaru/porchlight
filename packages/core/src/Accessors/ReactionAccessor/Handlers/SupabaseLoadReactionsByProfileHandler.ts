import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import { readAllPages } from "../../../Utilities/collections/readAllPages";
import type { LoadReactionsByProfileRequest } from "../Requests/LoadReactionsByProfileRequest";
import { ReactionAccessFailedResponse } from "../Responses/ReactionAccessFailedResponse";
import { ReactionsLoadedResponse } from "../Responses/ReactionsLoadedResponse";
import { REACTION_COLUMNS, toReaction } from "../toReaction";

type Result = ReactionsLoadedResponse | ReactionAccessFailedResponse;

// Every one of a member's reactions, past PostgREST's row cap: an export lists them all.
export class SupabaseLoadReactionsByProfileHandler implements IHandler<
  LoadReactionsByProfileRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: LoadReactionsByProfileRequest): Promise<Result> {
    const read = await readAllPages((from, to) =>
      this.db
        .from("reactions")
        .select(REACTION_COLUMNS)
        .eq("profile_id", request.profileId)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    );
    if ("error" in read) {
      return new ReactionAccessFailedResponse(request.correlationId, read.error);
    }
    return new ReactionsLoadedResponse(request.correlationId, read.rows.map(toReaction));
  }
}
