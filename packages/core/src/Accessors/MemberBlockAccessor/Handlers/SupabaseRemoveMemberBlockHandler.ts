import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { RemoveMemberBlockRequest } from "../Requests/RemoveMemberBlockRequest";
import { MemberBlockAccessFailedResponse } from "../Responses/MemberBlockAccessFailedResponse";
import { MemberBlockRemovedResponse } from "../Responses/MemberBlockRemovedResponse";

export class SupabaseRemoveMemberBlockHandler implements IHandler<
  RemoveMemberBlockRequest,
  MemberBlockRemovedResponse | MemberBlockAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: RemoveMemberBlockRequest,
  ): Promise<MemberBlockRemovedResponse | MemberBlockAccessFailedResponse> {
    const { error } = await this.db
      .from("member_blocks")
      .delete()
      .eq("member_id", request.memberId)
      .eq("target_id", request.targetId);
    if (error) {
      return new MemberBlockAccessFailedResponse(request.correlationId, error.message);
    }
    return new MemberBlockRemovedResponse(request.correlationId);
  }
}
