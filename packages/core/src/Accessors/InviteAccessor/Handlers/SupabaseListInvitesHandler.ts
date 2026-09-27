import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { ListInvitesRequest } from "../Requests/ListInvitesRequest";
import { InviteAccessFailedResponse } from "../Responses/InviteAccessFailedResponse";
import { InvitesLoadedResponse } from "../Responses/InvitesLoadedResponse";
import { INVITE_COLUMNS, toInvite } from "../toInvite";

const MAX_ROWS = 100;

export class SupabaseListInvitesHandler implements IHandler<
  ListInvitesRequest,
  InvitesLoadedResponse | InviteAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: ListInvitesRequest,
  ): Promise<InvitesLoadedResponse | InviteAccessFailedResponse> {
    const { data, error } = await this.db
      .from("invites")
      .select(INVITE_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS);
    if (error) {
      return new InviteAccessFailedResponse(request.correlationId, error.message);
    }
    return new InvitesLoadedResponse(request.correlationId, data.map(toInvite));
  }
}
