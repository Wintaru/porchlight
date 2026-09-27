import type { IInviteAccessor } from "../../../Accessors/InviteAccessor/IInviteAccessor";
import { MarkInviteRevokedRequest } from "../../../Accessors/InviteAccessor/Requests/MarkInviteRevokedRequest";
import { InviteNotFoundResponse } from "../../../Accessors/InviteAccessor/Responses/InviteNotFoundResponse";
import { InviteRevokedResponse } from "../../../Accessors/InviteAccessor/Responses/InviteRevokedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { permit } from "../permit";
import type { RevokeInviteRequest } from "../Requests/RevokeInviteRequest";
import type { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import type { ActionForbiddenResponse } from "../Responses/ActionForbiddenResponse";
import { InviteEndedResponse } from "../Responses/InviteEndedResponse";
import { NoSuchInviteResponse } from "../Responses/NoSuchInviteResponse";
import { unavailable } from "../unavailable";

type Result =
  | InviteEndedResponse
  | NoSuchInviteResponse
  | ActionForbiddenResponse
  | AccountUnavailableResponse;

export class RevokeInviteHandler implements IHandler<RevokeInviteRequest, Result> {
  constructor(
    private readonly invites: IInviteAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: RevokeInviteRequest): Promise<Result> {
    const { correlationId, actor, inviteId, timestamp } = request;
    const context = { correlationId, timestamp };
    const refused = await permit(
      this.permissions,
      actor,
      "invite.manage",
      { kind: "site" },
      context,
    );
    if (refused !== undefined) {
      return refused;
    }
    const revoked = await this.invites.store(
      new MarkInviteRevokedRequest(inviteId, context),
    );
    if (revoked instanceof InviteNotFoundResponse) {
      return new NoSuchInviteResponse(correlationId);
    }
    if (!(revoked instanceof InviteRevokedResponse)) {
      return unavailable(correlationId, revoked, "invites.store");
    }
    return new InviteEndedResponse(correlationId);
  }
}
