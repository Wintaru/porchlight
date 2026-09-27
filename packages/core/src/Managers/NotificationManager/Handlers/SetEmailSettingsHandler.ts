import type { IEmailPreferenceAccessor } from "../../../Accessors/EmailPreferenceAccessor/IEmailPreferenceAccessor";
import { StoreEmailPreferenceRequest } from "../../../Accessors/EmailPreferenceAccessor/Requests/StoreEmailPreferenceRequest";
import { EmailPreferenceStoredResponse } from "../../../Accessors/EmailPreferenceAccessor/Responses/EmailPreferenceStoredResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import type { EmailOptions } from "../emailOptions";
import { isStaff } from "../isStaff";
import { permit } from "../permit";
import type { SetEmailSettingsRequest } from "../Requests/SetEmailSettingsRequest";
import { EmailSettingsResponse } from "../Responses/EmailSettingsResponse";
import { NotificationForbiddenResponse } from "../Responses/NotificationForbiddenResponse";
import { NotificationUnavailableResponse } from "../Responses/NotificationUnavailableResponse";
import { unavailable } from "../unavailable";

type Result =
  EmailSettingsResponse | NotificationForbiddenResponse | NotificationUnavailableResponse;

// The member's own settings, nobody else's. The queue email is for the people who work
// the queue: a member who asks for it is refused, not quietly given a digest.
export class SetEmailSettingsHandler implements IHandler<
  SetEmailSettingsRequest,
  Result
> {
  constructor(
    private readonly preferences: IEmailPreferenceAccessor,
    private readonly permissions: IPermissionEngine,
    private readonly options: EmailOptions,
  ) {}

  async handle(request: SetEmailSettingsRequest): Promise<Result> {
    const { correlationId, actor, preference, timestamp } = request;
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
    const mayQueue = isStaff(actor.profile);
    if (preference.queueImmediate && !mayQueue) {
      return new NotificationForbiddenResponse(correlationId, "not-allowed");
    }
    const stored = await this.preferences.store(
      new StoreEmailPreferenceRequest(actor.profile.id, preference, context),
    );
    if (!(stored instanceof EmailPreferenceStoredResponse)) {
      return unavailable(correlationId, stored, "preferences.store");
    }
    return new EmailSettingsResponse(
      correlationId,
      this.options.enabled,
      preference,
      mayQueue,
    );
  }
}
