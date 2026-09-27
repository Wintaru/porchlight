import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { MarkInviteRevokedRequest } from "../Requests/MarkInviteRevokedRequest";
import { InviteAccessFailedResponse } from "../Responses/InviteAccessFailedResponse";
import { InviteNotFoundResponse } from "../Responses/InviteNotFoundResponse";
import { InviteRevokedResponse } from "../Responses/InviteRevokedResponse";

// Keeps the first revoke time: a second revoke finds the row and changes nothing.
export class SupabaseMarkInviteRevokedHandler implements IHandler<
  MarkInviteRevokedRequest,
  InviteRevokedResponse | InviteNotFoundResponse | InviteAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: MarkInviteRevokedRequest,
  ): Promise<
    InviteRevokedResponse | InviteNotFoundResponse | InviteAccessFailedResponse
  > {
    const { inviteId, correlationId, timestamp } = request;
    const { data, error } = await this.db
      .from("invites")
      .select("id, revoked_at")
      .eq("id", inviteId)
      .maybeSingle();
    if (error) {
      return new InviteAccessFailedResponse(correlationId, error.message);
    }
    if (data === null) {
      return new InviteNotFoundResponse(correlationId);
    }
    if (data.revoked_at === null) {
      const { error: updateError } = await this.db
        .from("invites")
        .update({ revoked_at: timestamp.toISOString() })
        .eq("id", inviteId)
        .is("revoked_at", null);
      if (updateError) {
        return new InviteAccessFailedResponse(correlationId, updateError.message);
      }
    }
    return new InviteRevokedResponse(correlationId);
  }
}
