import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadFollowsByMemberRequest } from "../Requests/LoadFollowsByMemberRequest";
import { FollowAccessFailedResponse } from "../Responses/FollowAccessFailedResponse";
import { FollowsLoadedResponse } from "../Responses/FollowsLoadedResponse";
import { FOLLOW_COLUMNS, toFollow } from "../toFollow";

// One member's follows are a bounded list, but an export must hold every one, so the
// read pages past PostgREST's 1000-row answer.
const PAGE = 1000;

export class SupabaseLoadFollowsByMemberHandler implements IHandler<
  LoadFollowsByMemberRequest,
  FollowsLoadedResponse | FollowAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadFollowsByMemberRequest,
  ): Promise<FollowsLoadedResponse | FollowAccessFailedResponse> {
    const follows = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await this.db
        .from("follows")
        .select(FOLLOW_COLUMNS)
        .eq("follower_id", request.followerId)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) {
        return new FollowAccessFailedResponse(request.correlationId, error.message);
      }
      follows.push(...data.flatMap((row) => toFollow(row) ?? []));
      if (data.length < PAGE) {
        return new FollowsLoadedResponse(request.correlationId, follows);
      }
    }
  }
}
