import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import { LoadPresenceSettingRequest } from "../../../Accessors/ProfileAccessor/Requests/LoadPresenceSettingRequest";
import { PresenceSettingLoadedResponse } from "../../../Accessors/ProfileAccessor/Responses/PresenceSettingLoadedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { ownProfileSubject } from "../ownProfileSubject";
import { permit } from "../permit";
import type { GetPresenceSettingRequest } from "../Requests/GetPresenceSettingRequest";
import { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import type { ActionForbiddenResponse } from "../Responses/ActionForbiddenResponse";
import { PresenceSettingResponse } from "../Responses/PresenceSettingResponse";
import { unavailable } from "../unavailable";

type Result =
  PresenceSettingResponse | ActionForbiddenResponse | AccountUnavailableResponse;

export class GetPresenceSettingHandler implements IHandler<
  GetPresenceSettingRequest,
  Result
> {
  constructor(
    private readonly profiles: IProfileAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: GetPresenceSettingRequest): Promise<Result> {
    const { correlationId, actor, timestamp } = request;
    const context = { correlationId, timestamp };
    const refused = await permit(
      this.permissions,
      actor,
      "presence.manage",
      ownProfileSubject(actor),
      context,
    );
    if (refused !== undefined) {
      return refused;
    }
    if (actor.kind === "visitor") {
      return new AccountUnavailableResponse(
        correlationId,
        "presence.manage granted to a visitor",
      );
    }
    const loaded = await this.profiles.load(
      new LoadPresenceSettingRequest(actor.profile.id, context),
    );
    if (!(loaded instanceof PresenceSettingLoadedResponse)) {
      return unavailable(correlationId, loaded, "profiles.load");
    }
    return new PresenceSettingResponse(correlationId, loaded.visible);
  }
}
