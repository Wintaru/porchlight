import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import { TRUST_LEVELS } from "../../../Common/TrustLevel";
import type { RedeemInviteRequest } from "../Requests/RedeemInviteRequest";
import { InviteAccessFailedResponse } from "../Responses/InviteAccessFailedResponse";
import { InviteNotRedeemableResponse } from "../Responses/InviteNotRedeemableResponse";
import { InviteRedeemedResponse } from "../Responses/InviteRedeemedResponse";

export class SupabaseRedeemInviteHandler implements IHandler<
  RedeemInviteRequest,
  InviteRedeemedResponse | InviteNotRedeemableResponse | InviteAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: RedeemInviteRequest,
  ): Promise<
    InviteRedeemedResponse | InviteNotRedeemableResponse | InviteAccessFailedResponse
  > {
    const { data, error } = await this.db.rpc("redeem_invite", {
      p_token_hash: request.tokenHash,
    });
    if (error) {
      return new InviteAccessFailedResponse(request.correlationId, error.message);
    }
    // PostgREST answers null when the update matched no row.
    const trust = TRUST_LEVELS.find((level) => level === data);
    if (trust === undefined) {
      return new InviteNotRedeemableResponse(request.correlationId);
    }
    return new InviteRedeemedResponse(request.correlationId, trust);
  }
}
