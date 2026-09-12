import type { DbClient, TablesInsert } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import { isAlreadyReacted } from "../PostgresErrorCode";
import type { Reaction } from "../Reaction";
import type { StoreReactionRequest } from "../Requests/StoreReactionRequest";
import { ReactionAccessFailedResponse } from "../Responses/ReactionAccessFailedResponse";
import { ReactionExistsResponse } from "../Responses/ReactionExistsResponse";
import { ReactionStoredResponse } from "../Responses/ReactionStoredResponse";

export class SupabaseStoreReactionHandler implements IHandler<
  StoreReactionRequest,
  ReactionStoredResponse | ReactionExistsResponse | ReactionAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: StoreReactionRequest,
  ): Promise<
    ReactionStoredResponse | ReactionExistsResponse | ReactionAccessFailedResponse
  > {
    const { error } = await this.db.from("reactions").insert(toInsert(request.reaction));
    if (error) {
      return isAlreadyReacted(error)
        ? new ReactionExistsResponse(request.correlationId)
        : new ReactionAccessFailedResponse(request.correlationId, error.message);
    }
    return new ReactionStoredResponse(request.correlationId);
  }
}

function toInsert(reaction: Reaction): TablesInsert<"reactions"> {
  return {
    post_id: reaction.target.kind === "post" ? reaction.target.id : null,
    comment_id: reaction.target.kind === "comment" ? reaction.target.id : null,
    profile_id: reaction.profileId,
    kind: reaction.kind,
  };
}
