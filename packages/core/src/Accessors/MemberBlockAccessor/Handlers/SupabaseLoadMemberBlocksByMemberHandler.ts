import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadMemberBlocksByMemberRequest } from "../Requests/LoadMemberBlocksByMemberRequest";
import { MemberBlockAccessFailedResponse } from "../Responses/MemberBlockAccessFailedResponse";
import { MemberBlocksLoadedResponse } from "../Responses/MemberBlocksLoadedResponse";
import { MEMBER_BLOCK_COLUMNS, toMemberBlock } from "../toMemberBlock";

export class SupabaseLoadMemberBlocksByMemberHandler implements IHandler<
  LoadMemberBlocksByMemberRequest,
  MemberBlocksLoadedResponse | MemberBlockAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadMemberBlocksByMemberRequest,
  ): Promise<MemberBlocksLoadedResponse | MemberBlockAccessFailedResponse> {
    const { data, error } = await this.db
      .from("member_blocks")
      .select(MEMBER_BLOCK_COLUMNS)
      .eq("member_id", request.memberId)
      .order("created_at", { ascending: true });
    if (error) {
      return new MemberBlockAccessFailedResponse(request.correlationId, error.message);
    }
    return new MemberBlocksLoadedResponse(request.correlationId, data.map(toMemberBlock));
  }
}
