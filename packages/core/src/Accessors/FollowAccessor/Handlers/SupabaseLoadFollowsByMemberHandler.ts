import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import { readAllPages } from "../../../Utilities/collections/readAllPages";
import type { LoadFollowsByMemberRequest } from "../Requests/LoadFollowsByMemberRequest";
import { FollowAccessFailedResponse } from "../Responses/FollowAccessFailedResponse";
import { FollowsLoadedResponse } from "../Responses/FollowsLoadedResponse";
import { FOLLOW_COLUMNS, toFollow } from "../toFollow";

// One member's follows are a bounded list, but an export must hold every one, so the
// read pages past PostgREST's row cap.
export class SupabaseLoadFollowsByMemberHandler implements IHandler<
  LoadFollowsByMemberRequest,
  FollowsLoadedResponse | FollowAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadFollowsByMemberRequest,
  ): Promise<FollowsLoadedResponse | FollowAccessFailedResponse> {
    const read = await readAllPages((from, to) =>
      this.db
        .from("follows")
        .select(FOLLOW_COLUMNS)
        .eq("follower_id", request.followerId)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    );
    if ("error" in read) {
      return new FollowAccessFailedResponse(request.correlationId, read.error);
    }
    return new FollowsLoadedResponse(
      request.correlationId,
      read.rows.flatMap((row) => toFollow(row) ?? []),
    );
  }
}
