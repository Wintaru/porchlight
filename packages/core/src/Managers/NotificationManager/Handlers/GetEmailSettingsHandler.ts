import type { IEmailPreferenceAccessor } from "../../../Accessors/EmailPreferenceAccessor/IEmailPreferenceAccessor";
import { LoadEmailPreferenceRequest } from "../../../Accessors/EmailPreferenceAccessor/Requests/LoadEmailPreferenceRequest";
import { EmailPreferenceLoadedResponse } from "../../../Accessors/EmailPreferenceAccessor/Responses/EmailPreferenceLoadedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import type { EmailOptions } from "../emailOptions";
import { isStaff } from "../isStaff";
import { permit } from "../permit";
import type { GetEmailSettingsRequest } from "../Requests/GetEmailSettingsRequest";
import { EmailSettingsResponse } from "../Responses/EmailSettingsResponse";
import type { NotificationForbiddenResponse } from "../Responses/NotificationForbiddenResponse";
import { NotificationUnavailableResponse } from "../Responses/NotificationUnavailableResponse";
import { unavailable } from "../unavailable";

type Result =
  EmailSettingsResponse | NotificationForbiddenResponse | NotificationUnavailableResponse;

export class GetEmailSettingsHandler implements IHandler<
  GetEmailSettingsRequest,
  Result
> {
  constructor(
    private readonly preferences: IEmailPreferenceAccessor,
    private readonly permissions: IPermissionEngine,
    private readonly options: EmailOptions,
  ) {}

  async handle(request: GetEmailSettingsRequest): Promise<Result> {
    const { correlationId, actor, timestamp } = request;
    const context = { correlationId, timestamp };
    const refused = await permit(
      this.permissions,
      actor,
      "notification.manage",
      { kind: "profile", id: actor.kind === "member" ? actor.profile.id : "" },
      context,
    );
    if (refused !== undefined) {
      return refused;
    }
    if (actor.kind !== "member") {
      return new NotificationUnavailableResponse(
        correlationId,
        "notification.manage granted to a non-member",
      );
    }
    const loaded = await this.preferences.load(
      new LoadEmailPreferenceRequest(actor.profile.id, context),
    );
    if (!(loaded instanceof EmailPreferenceLoadedResponse)) {
      return unavailable(correlationId, loaded, "preferences.load");
    }
    return new EmailSettingsResponse(
      correlationId,
      this.options.enabled,
      loaded.preference,
      isStaff(actor.profile),
    );
  }
}
