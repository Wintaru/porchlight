import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { StoreMemberBlockRequest } from "../Requests/StoreMemberBlockRequest";
import { MemberBlockAccessFailedResponse } from "../Responses/MemberBlockAccessFailedResponse";
import { MemberBlockStoredResponse } from "../Responses/MemberBlockStoredResponse";

// An upsert on the pair: blocking a member you muted raises the level in place.
export class SupabaseStoreMemberBlockHandler implements IHandler<
  StoreMemberBlockRequest,
  MemberBlockStoredResponse | MemberBlockAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: StoreMemberBlockRequest,
  ): Promise<MemberBlockStoredResponse | MemberBlockAccessFailedResponse> {
    const { error } = await this.db.from("member_blocks").upsert(
      {
        member_id: request.memberId,
        target_id: request.targetId,
        level: request.level,
      },
      { onConflict: "member_id,target_id" },
    );
    if (error) {
      return new MemberBlockAccessFailedResponse(request.correlationId, error.message);
    }
    return new MemberBlockStoredResponse(request.correlationId);
  }
}
