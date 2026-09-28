import type { IHandler } from "../../../Common/IHandler";
import type { FakeInviteState } from "../FakeInviteState";
import type { RedeemInviteRequest } from "../Requests/RedeemInviteRequest";
import { InviteAccessFailedResponse } from "../Responses/InviteAccessFailedResponse";
import { InviteNotRedeemableResponse } from "../Responses/InviteNotRedeemableResponse";
import { InviteRedeemedResponse } from "../Responses/InviteRedeemedResponse";

export class FakeRedeemInviteHandler implements IHandler<
  RedeemInviteRequest,
  InviteRedeemedResponse | InviteNotRedeemableResponse | InviteAccessFailedResponse
> {
  constructor(private readonly state: FakeInviteState) {}

  handle(
    request: RedeemInviteRequest,
  ): Promise<
    InviteRedeemedResponse | InviteNotRedeemableResponse | InviteAccessFailedResponse
  > {
    if (this.state.failing) {
      return Promise.resolve(
        new InviteAccessFailedResponse(request.correlationId, "INVITE_FAKE_RESULT=fail"),
      );
    }
    for (const row of this.state.invites.values()) {
      if (
        row.tokenHash === request.tokenHash &&
        this.state.isLive(row.invite, request.timestamp)
      ) {
        row.invite = { ...row.invite, usedCount: row.invite.usedCount + 1 };
        return Promise.resolve(
          new InviteRedeemedResponse(request.correlationId, row.invite.trustLevel),
        );
      }
    }
    return Promise.resolve(new InviteNotRedeemableResponse(request.correlationId));
  }
}
