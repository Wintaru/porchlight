import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { StoreNewInviteRequest } from "../Requests/StoreNewInviteRequest";
import { InviteAccessFailedResponse } from "../Responses/InviteAccessFailedResponse";
import { InviteStoredResponse } from "../Responses/InviteStoredResponse";
import { INVITE_COLUMNS, toInvite } from "../toInvite";

export class SupabaseStoreNewInviteHandler implements IHandler<
  StoreNewInviteRequest,
  InviteStoredResponse | InviteAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: StoreNewInviteRequest,
  ): Promise<InviteStoredResponse | InviteAccessFailedResponse> {
    const { invite, correlationId } = request;
    const { data, error } = await this.db
      .from("invites")
      .insert({
        token_hash: invite.tokenHash,
        created_by: invite.createdBy,
        expires_at: invite.expiresAt?.toISOString() ?? null,
        max_uses: invite.maxUses,
        trust_level: invite.trustLevel,
      })
      .select(INVITE_COLUMNS)
      .single();
    if (error) {
      return new InviteAccessFailedResponse(correlationId, error.message);
    }
    return new InviteStoredResponse(correlationId, toInvite(data));
  }
}
