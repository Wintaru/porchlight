import type { IHandler } from "../../../Common/IHandler";
import type { FakeInviteState } from "../FakeInviteState";
import type { StoreNewInviteRequest } from "../Requests/StoreNewInviteRequest";
import { InviteAccessFailedResponse } from "../Responses/InviteAccessFailedResponse";
import { InviteStoredResponse } from "../Responses/InviteStoredResponse";

export class FakeStoreNewInviteHandler implements IHandler<
  StoreNewInviteRequest,
  InviteStoredResponse | InviteAccessFailedResponse
> {
  constructor(private readonly state: FakeInviteState) {}

  handle(
    request: StoreNewInviteRequest,
  ): Promise<InviteStoredResponse | InviteAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new InviteAccessFailedResponse(request.correlationId, "INVITE_FAKE_RESULT=fail"),
      );
    }
    const { tokenHash, expiresAt, maxUses, trustLevel } = request.invite;
    const invite = {
      id: globalThis.crypto.randomUUID(),
      createdAt: request.timestamp,
      expiresAt,
      maxUses,
      usedCount: 0,
      trustLevel,
      revokedAt: null,
    };
    this.state.invites.set(invite.id, { tokenHash, invite });
    return Promise.resolve(new InviteStoredResponse(request.correlationId, invite));
  }
}
