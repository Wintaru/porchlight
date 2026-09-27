import type { IHandler } from "../../../Common/IHandler";
import type { FakeInviteState } from "../FakeInviteState";
import type { ReleaseInviteRequest } from "../Requests/ReleaseInviteRequest";
import { InviteAccessFailedResponse } from "../Responses/InviteAccessFailedResponse";
import { InviteReleasedResponse } from "../Responses/InviteReleasedResponse";

export class FakeReleaseInviteHandler implements IHandler<
  ReleaseInviteRequest,
  InviteReleasedResponse | InviteAccessFailedResponse
> {
  constructor(private readonly state: FakeInviteState) {}

  handle(
    request: ReleaseInviteRequest,
  ): Promise<InviteReleasedResponse | InviteAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new InviteAccessFailedResponse(request.correlationId, "INVITE_FAKE_RESULT=fail"),
      );
    }
    for (const row of this.state.invites.values()) {
      if (row.tokenHash === request.tokenHash && row.invite.usedCount > 0) {
        row.invite = { ...row.invite, usedCount: row.invite.usedCount - 1 };
      }
    }
    return Promise.resolve(new InviteReleasedResponse(request.correlationId));
  }
}
