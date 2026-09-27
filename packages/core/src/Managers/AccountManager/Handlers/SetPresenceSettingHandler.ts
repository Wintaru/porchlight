import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import { StorePresenceSettingRequest } from "../../../Accessors/ProfileAccessor/Requests/StorePresenceSettingRequest";
import { PresenceSettingStoredResponse } from "../../../Accessors/ProfileAccessor/Responses/PresenceSettingStoredResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { ownProfileSubject } from "../ownProfileSubject";
import { permit } from "../permit";
import type { SetPresenceSettingRequest } from "../Requests/SetPresenceSettingRequest";
import { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import type { ActionForbiddenResponse } from "../Responses/ActionForbiddenResponse";
import { PresenceSettingResponse } from "../Responses/PresenceSettingResponse";
import { unavailable } from "../unavailable";

type Result =
  PresenceSettingResponse | ActionForbiddenResponse | AccountUnavailableResponse;

export class SetPresenceSettingHandler implements IHandler<
  SetPresenceSettingRequest,
  Result
> {
  constructor(
    private readonly profiles: IProfileAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: SetPresenceSettingRequest): Promise<Result> {
    const { correlationId, actor, visible, timestamp } = request;
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
    const stored = await this.profiles.store(
      new StorePresenceSettingRequest(actor.profile.id, visible, context),
    );
    if (!(stored instanceof PresenceSettingStoredResponse)) {
      return unavailable(correlationId, stored, "profiles.store");
    }
    return new PresenceSettingResponse(correlationId, visible);
  }
}
