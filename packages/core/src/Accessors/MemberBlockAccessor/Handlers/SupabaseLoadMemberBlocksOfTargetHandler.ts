import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadMemberBlocksOfTargetRequest } from "../Requests/LoadMemberBlocksOfTargetRequest";
import { MemberBlockAccessFailedResponse } from "../Responses/MemberBlockAccessFailedResponse";
import { MemberBlocksLoadedResponse } from "../Responses/MemberBlocksLoadedResponse";
import { MEMBER_BLOCK_COLUMNS, toMemberBlock } from "../toMemberBlock";

export class SupabaseLoadMemberBlocksOfTargetHandler implements IHandler<
  LoadMemberBlocksOfTargetRequest,
  MemberBlocksLoadedResponse | MemberBlockAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadMemberBlocksOfTargetRequest,
  ): Promise<MemberBlocksLoadedResponse | MemberBlockAccessFailedResponse> {
    if (request.memberIds.length === 0) {
      return new MemberBlocksLoadedResponse(request.correlationId, []);
    }
    const { data, error } = await this.db
      .from("member_blocks")
      .select(MEMBER_BLOCK_COLUMNS)
      .eq("target_id", request.targetId)
      .in("member_id", [...request.memberIds]);
    if (error) {
      return new MemberBlockAccessFailedResponse(request.correlationId, error.message);
    }
    return new MemberBlocksLoadedResponse(request.correlationId, data.map(toMemberBlock));
  }
}
