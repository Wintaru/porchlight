import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { RemoveFollowRequest } from "../Requests/RemoveFollowRequest";
import { FollowAccessFailedResponse } from "../Responses/FollowAccessFailedResponse";
import { FollowRemovedResponse } from "../Responses/FollowRemovedResponse";
import { tagIdOf } from "../tagIdOf";

export class SupabaseRemoveFollowHandler implements IHandler<
  RemoveFollowRequest,
  FollowRemovedResponse | FollowAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: RemoveFollowRequest,
  ): Promise<FollowRemovedResponse | FollowAccessFailedResponse> {
    const { followerId, target, correlationId } = request;
    const query = this.db.from("follows").delete().eq("follower_id", followerId);
    if (target.kind === "author") {
      const { error } = await query.eq("author_id", target.profileId);
      return error
        ? new FollowAccessFailedResponse(correlationId, error.message)
        : new FollowRemovedResponse(correlationId);
    }
    const found = await tagIdOf(this.db, target.slug);
    if (found.error !== undefined) {
      return new FollowAccessFailedResponse(correlationId, found.error);
    }
    // No such tag: nothing can follow it, so there is nothing to remove.
    if (found.id === undefined) {
      return new FollowRemovedResponse(correlationId);
    }
    const { error } = await query.eq("tag_id", found.id);
    return error
      ? new FollowAccessFailedResponse(correlationId, error.message)
      : new FollowRemovedResponse(correlationId);
  }
}
