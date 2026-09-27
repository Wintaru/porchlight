import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { ReleaseInviteRequest } from "../Requests/ReleaseInviteRequest";
import { InviteAccessFailedResponse } from "../Responses/InviteAccessFailedResponse";
import { InviteReleasedResponse } from "../Responses/InviteReleasedResponse";

export class SupabaseReleaseInviteHandler implements IHandler<
  ReleaseInviteRequest,
  InviteReleasedResponse | InviteAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: ReleaseInviteRequest,
  ): Promise<InviteReleasedResponse | InviteAccessFailedResponse> {
    const { error } = await this.db.rpc("release_invite", {
      p_token_hash: request.tokenHash,
    });
    if (error) {
      return new InviteAccessFailedResponse(request.correlationId, error.message);
    }
    return new InviteReleasedResponse(request.correlationId);
  }
}
