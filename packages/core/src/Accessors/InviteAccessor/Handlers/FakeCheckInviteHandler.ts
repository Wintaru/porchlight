import type { IHandler } from "../../../Common/IHandler";
import type { FakeInviteState } from "../FakeInviteState";
import type { CheckInviteRequest } from "../Requests/CheckInviteRequest";
import { InviteAccessFailedResponse } from "../Responses/InviteAccessFailedResponse";
import { InviteCheckedResponse } from "../Responses/InviteCheckedResponse";

export class FakeCheckInviteHandler implements IHandler<
  CheckInviteRequest,
  InviteCheckedResponse | InviteAccessFailedResponse
> {
  constructor(private readonly state: FakeInviteState) {}

  handle(
    request: CheckInviteRequest,
  ): Promise<InviteCheckedResponse | InviteAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new InviteAccessFailedResponse(request.correlationId, "INVITE_FAKE_RESULT=fail"),
      );
    }
    const live = [...this.state.invites.values()].some(
      (row) =>
        row.tokenHash === request.tokenHash &&
        this.state.isLive(row.invite, request.timestamp),
    );
    return Promise.resolve(new InviteCheckedResponse(request.correlationId, live));
  }
}
