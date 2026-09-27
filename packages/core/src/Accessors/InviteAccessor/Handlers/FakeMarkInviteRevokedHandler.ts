import type { IHandler } from "../../../Common/IHandler";
import type { FakeInviteState } from "../FakeInviteState";
import type { MarkInviteRevokedRequest } from "../Requests/MarkInviteRevokedRequest";
import { InviteAccessFailedResponse } from "../Responses/InviteAccessFailedResponse";
import { InviteNotFoundResponse } from "../Responses/InviteNotFoundResponse";
import { InviteRevokedResponse } from "../Responses/InviteRevokedResponse";

export class FakeMarkInviteRevokedHandler implements IHandler<
  MarkInviteRevokedRequest,
  InviteRevokedResponse | InviteNotFoundResponse | InviteAccessFailedResponse
> {
  constructor(private readonly state: FakeInviteState) {}

  handle(
    request: MarkInviteRevokedRequest,
  ): Promise<
    InviteRevokedResponse | InviteNotFoundResponse | InviteAccessFailedResponse
  > {
    if (this.state.failing) {
      return Promise.resolve(
        new InviteAccessFailedResponse(request.correlationId, "INVITE_FAKE_RESULT=fail"),
      );
    }
    const row = this.state.invites.get(request.inviteId);
    if (row === undefined) {
      return Promise.resolve(new InviteNotFoundResponse(request.correlationId));
    }
    if (row.invite.revokedAt === null) {
      row.invite = { ...row.invite, revokedAt: request.timestamp };
    }
    return Promise.resolve(new InviteRevokedResponse(request.correlationId));
  }
}
