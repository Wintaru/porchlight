import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { CheckInviteRequest } from "../Requests/CheckInviteRequest";
import { InviteAccessFailedResponse } from "../Responses/InviteAccessFailedResponse";
import { InviteCheckedResponse } from "../Responses/InviteCheckedResponse";

// `check_invite` answers by the same SQL rule `redeem_invite` spends by (#92).
export class SupabaseCheckInviteHandler implements IHandler<
  CheckInviteRequest,
  InviteCheckedResponse | InviteAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: CheckInviteRequest,
  ): Promise<InviteCheckedResponse | InviteAccessFailedResponse> {
    const { data, error } = await this.db.rpc("check_invite", {
      p_token_hash: request.tokenHash,
    });
    if (error) {
      return new InviteAccessFailedResponse(request.correlationId, error.message);
    }
    return new InviteCheckedResponse(request.correlationId, data);
  }
}
