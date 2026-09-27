import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadMemberBlocksOfTargetRequest } from "../Requests/LoadMemberBlocksOfTargetRequest";
import { MemberBlockAccessFailedResponse } from "../Responses/MemberBlockAccessFailedResponse";
import { MemberBlocksLoadedResponse } from "../Responses/MemberBlocksLoadedResponse";
import { MEMBER_BLOCK_COLUMNS, toMemberBlock } from "../toMemberBlock";

// About 37 bytes of URL per uuid: 100 keeps a request far under proxy URL limits.
const ID_CHUNK = 100;

export class SupabaseLoadMemberBlocksOfTargetHandler implements IHandler<
  LoadMemberBlocksOfTargetRequest,
  MemberBlocksLoadedResponse | MemberBlockAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadMemberBlocksOfTargetRequest,
  ): Promise<MemberBlocksLoadedResponse | MemberBlockAccessFailedResponse> {
    const blocks = [];
    // The ids go in the URL, so a long list (a post's followers) is read in chunks.
    for (let start = 0; start < request.memberIds.length; start += ID_CHUNK) {
      const { data, error } = await this.db
        .from("member_blocks")
        .select(MEMBER_BLOCK_COLUMNS)
        .eq("target_id", request.targetId)
        .in("member_id", request.memberIds.slice(start, start + ID_CHUNK));
      if (error) {
        return new MemberBlockAccessFailedResponse(request.correlationId, error.message);
      }
      blocks.push(...data.map(toMemberBlock));
    }
    return new MemberBlocksLoadedResponse(request.correlationId, blocks);
  }
}
