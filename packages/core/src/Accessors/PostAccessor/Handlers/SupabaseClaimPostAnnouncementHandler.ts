import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { ClaimPostAnnouncementRequest } from "../Requests/ClaimPostAnnouncementRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostAlreadyAnnouncedResponse } from "../Responses/PostAlreadyAnnouncedResponse";
import { PostAnnouncementClaimedResponse } from "../Responses/PostAnnouncementClaimedResponse";

type Result =
  | PostAnnouncementClaimedResponse
  | PostAlreadyAnnouncedResponse
  | PostAccessFailedResponse;

// One conditional update: of two callers that race, only one sees its row come back.
export class SupabaseClaimPostAnnouncementHandler implements IHandler<
  ClaimPostAnnouncementRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: ClaimPostAnnouncementRequest): Promise<Result> {
    const { data, error } = await this.db
      .from("posts")
      .update({ announced_at: request.timestamp.toISOString() })
      .eq("id", request.postId)
      .is("announced_at", null)
      .select("id");
    if (error) {
      return new PostAccessFailedResponse(request.correlationId, error.message);
    }
    return data.length === 0
      ? new PostAlreadyAnnouncedResponse(request.correlationId)
      : new PostAnnouncementClaimedResponse(request.correlationId);
  }
}
