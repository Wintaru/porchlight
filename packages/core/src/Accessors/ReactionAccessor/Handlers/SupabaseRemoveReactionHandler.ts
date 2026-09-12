import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { RemoveReactionRequest } from "../Requests/RemoveReactionRequest";
import { ReactionAccessFailedResponse } from "../Responses/ReactionAccessFailedResponse";
import { ReactionNotFoundResponse } from "../Responses/ReactionNotFoundResponse";
import { ReactionRemovedResponse } from "../Responses/ReactionRemovedResponse";

export class SupabaseRemoveReactionHandler implements IHandler<
  RemoveReactionRequest,
  ReactionRemovedResponse | ReactionNotFoundResponse | ReactionAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: RemoveReactionRequest,
  ): Promise<
    ReactionRemovedResponse | ReactionNotFoundResponse | ReactionAccessFailedResponse
  > {
    const { target, profileId, kind } = request.reaction;
    const { data, error } = await this.db
      .from("reactions")
      .delete()
      .eq(target.kind === "post" ? "post_id" : "comment_id", target.id)
      .eq("profile_id", profileId)
      .eq("kind", kind)
      .select("id")
      .maybeSingle();
    if (error) {
      return new ReactionAccessFailedResponse(request.correlationId, error.message);
    }
    if (data === null) {
      return new ReactionNotFoundResponse(request.correlationId);
    }
    return new ReactionRemovedResponse(request.correlationId);
  }
}
