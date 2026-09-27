import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import { FOREIGN_KEY_VIOLATION, UNIQUE_VIOLATION } from "../PostgresErrorCode";
import type { StoreFollowRequest } from "../Requests/StoreFollowRequest";
import { FollowAccessFailedResponse } from "../Responses/FollowAccessFailedResponse";
import { FollowStoredResponse } from "../Responses/FollowStoredResponse";
import { FollowTargetMissingResponse } from "../Responses/FollowTargetMissingResponse";
import { tagIdOf } from "../tagIdOf";

type Result =
  FollowStoredResponse | FollowTargetMissingResponse | FollowAccessFailedResponse;

export class SupabaseStoreFollowHandler implements IHandler<StoreFollowRequest, Result> {
  constructor(private readonly db: DbClient) {}

  async handle(request: StoreFollowRequest): Promise<Result> {
    const { followerId, target, correlationId } = request;
    let tagId: string | null = null;
    if (target.kind === "tag") {
      const found = await tagIdOf(this.db, target.slug);
      if (found.error !== undefined) {
        return new FollowAccessFailedResponse(correlationId, found.error);
      }
      if (found.id === undefined) {
        return new FollowTargetMissingResponse(correlationId);
      }
      tagId = found.id;
    }
    const { error } = await this.db.from("follows").insert({
      follower_id: followerId,
      author_id: target.kind === "author" ? target.profileId : null,
      tag_id: tagId,
    });
    if (error === null || error.code === UNIQUE_VIOLATION) {
      return new FollowStoredResponse(correlationId);
    }
    if (error.code === FOREIGN_KEY_VIOLATION) {
      return new FollowTargetMissingResponse(correlationId);
    }
    return new FollowAccessFailedResponse(correlationId, error.message);
  }
}
