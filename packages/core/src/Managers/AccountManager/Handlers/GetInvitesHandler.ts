import type { IInviteAccessor } from "../../../Accessors/InviteAccessor/IInviteAccessor";
import { ListInvitesRequest } from "../../../Accessors/InviteAccessor/Requests/ListInvitesRequest";
import { InvitesLoadedResponse } from "../../../Accessors/InviteAccessor/Responses/InvitesLoadedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { permit } from "../permit";
import type { GetInvitesRequest } from "../Requests/GetInvitesRequest";
import type { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import type { ActionForbiddenResponse } from "../Responses/ActionForbiddenResponse";
import { InvitesResponse } from "../Responses/InvitesResponse";
import { unavailable } from "../unavailable";

type Result = InvitesResponse | ActionForbiddenResponse | AccountUnavailableResponse;

export class GetInvitesHandler implements IHandler<GetInvitesRequest, Result> {
  constructor(
    private readonly invites: IInviteAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: GetInvitesRequest): Promise<Result> {
    const { correlationId, actor, timestamp } = request;
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
    const loaded = await this.invites.load(new ListInvitesRequest(context));
    if (!(loaded instanceof InvitesLoadedResponse)) {
      return unavailable(correlationId, loaded, "invites.load");
    }
    return new InvitesResponse(correlationId, loaded.invites);
  }
}
