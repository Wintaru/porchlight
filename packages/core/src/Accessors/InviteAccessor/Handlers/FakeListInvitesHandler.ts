import type { IHandler } from "../../../Common/IHandler";
import type { FakeInviteState } from "../FakeInviteState";
import type { ListInvitesRequest } from "../Requests/ListInvitesRequest";
import { InviteAccessFailedResponse } from "../Responses/InviteAccessFailedResponse";
import { InvitesLoadedResponse } from "../Responses/InvitesLoadedResponse";

export class FakeListInvitesHandler implements IHandler<
  ListInvitesRequest,
  InvitesLoadedResponse | InviteAccessFailedResponse
> {
  constructor(private readonly state: FakeInviteState) {}

  handle(
    request: ListInvitesRequest,
  ): Promise<InvitesLoadedResponse | InviteAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new InviteAccessFailedResponse(request.correlationId, "INVITE_FAKE_RESULT=fail"),
      );
    }
    const invites = [...this.state.invites.values()]
      .map((row) => this.state.read(row.invite, request.timestamp))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return Promise.resolve(new InvitesLoadedResponse(request.correlationId, invites));
  }
}
