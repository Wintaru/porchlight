import type { IAuditAccessor } from "../../../Accessors/AuditAccessor/IAuditAccessor";
import type { IModActionAccessor } from "../../../Accessors/ModActionAccessor/IModActionAccessor";
import type { INotificationAccessor } from "../../../Accessors/NotificationAccessor/INotificationAccessor";
import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import type { IReportAccessor } from "../../../Accessors/ReportAccessor/IReportAccessor";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { actorId } from "../actorId";
import { moderateProfile } from "../moderateProfile";
import { memberNotice } from "../notificationsForItem";
import { recordModeration } from "../recordModeration";
import type { BanMemberRequest } from "../Requests/BanMemberRequest";
import type { ModerationForbiddenResponse } from "../Responses/ModerationForbiddenResponse";
import type { ModerationUnavailableResponse } from "../Responses/ModerationUnavailableResponse";
import type { NoSuchProfileResponse } from "../Responses/NoSuchProfileResponse";
import { ProfileModeratedResponse } from "../Responses/ProfileModeratedResponse";

type Result =
  | ProfileModeratedResponse
  | NoSuchProfileResponse
  | ModerationForbiddenResponse
  | ModerationUnavailableResponse;

export class BanMemberHandler implements IHandler<BanMemberRequest, Result> {
  constructor(
    private readonly profiles: IProfileAccessor,
    private readonly modActions: IModActionAccessor,
    private readonly auditLog: IAuditAccessor,
    private readonly reports: IReportAccessor,
    private readonly notifications: INotificationAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: BanMemberRequest): Promise<Result> {
    const { correlationId, actor, profileId, reason, timestamp } = request;
    const context = { correlationId, timestamp };

    const result = await moderateProfile(
      this.profiles,
      this.permissions,
      actor,
      profileId,
      "profile.moderate",
      { status: "banned" },
      context,
    );
    if (!("id" in result)) {
      return result;
    }

    const recorded = await recordModeration(
      this.modActions,
      this.auditLog,
      this.reports,
      this.notifications,
      {
        actorId: actorId(actor),
        action: "ban",
        target: { kind: "profile", id: profileId },
        reason,
        event: "mod.action",
        auditDetails: { action: "ban", targetProfileId: profileId, reason },
        notify: memberNotice(profileId, "ban", reason),
      },
      context,
    );
    if (recorded !== undefined) {
      return recorded;
    }
    return new ProfileModeratedResponse(correlationId, result);
  }
}
