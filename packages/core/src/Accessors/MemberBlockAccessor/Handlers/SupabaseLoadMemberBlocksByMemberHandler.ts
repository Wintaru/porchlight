import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import { readAllPages } from "../../../Utilities/collections/readAllPages";
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
    // Every one, past PostgREST's row cap: an export lists them all. The key is
    // (member_id, target_id), so `target_id` breaks ties.
    const read = await readAllPages((from, to) =>
      this.db
        .from("member_blocks")
        .select(MEMBER_BLOCK_COLUMNS)
        .eq("member_id", request.memberId)
        .order("created_at", { ascending: true })
        .order("target_id", { ascending: true })
        .range(from, to),
    );
    if ("error" in read) {
      return new MemberBlockAccessFailedResponse(request.correlationId, read.error);
    }
    return new MemberBlocksLoadedResponse(
      request.correlationId,
      read.rows.map(toMemberBlock),
    );
  }
}
