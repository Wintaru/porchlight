import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import { isInviteLive } from "../../../Common/Invite";
import type { CheckInviteRequest } from "../Requests/CheckInviteRequest";
import { InviteAccessFailedResponse } from "../Responses/InviteAccessFailedResponse";
import { InviteCheckedResponse } from "../Responses/InviteCheckedResponse";
import { INVITE_COLUMNS, toInvite } from "../toInvite";

export class SupabaseCheckInviteHandler implements IHandler<
  CheckInviteRequest,
  InviteCheckedResponse | InviteAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: CheckInviteRequest,
  ): Promise<InviteCheckedResponse | InviteAccessFailedResponse> {
    const { data, error } = await this.db
      .from("invites")
      .select(INVITE_COLUMNS)
      .eq("token_hash", request.tokenHash)
      .maybeSingle();
    if (error) {
      return new InviteAccessFailedResponse(request.correlationId, error.message);
    }
    return new InviteCheckedResponse(
      request.correlationId,
      data !== null && isInviteLive(toInvite(data), request.timestamp),
    );
  }
}
