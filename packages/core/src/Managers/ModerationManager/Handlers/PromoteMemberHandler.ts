import type { IAuditAccessor } from "../../../Accessors/AuditAccessor/IAuditAccessor";
import type { IModActionAccessor } from "../../../Accessors/ModActionAccessor/IModActionAccessor";
import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import type { IReportAccessor } from "../../../Accessors/ReportAccessor/IReportAccessor";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { actorId } from "../actorId";
import { moderateProfile } from "../moderateProfile";
import { recordModeration } from "../recordModeration";
import type { PromoteMemberRequest } from "../Requests/PromoteMemberRequest";
import type { ModerationForbiddenResponse } from "../Responses/ModerationForbiddenResponse";
import type { ModerationUnavailableResponse } from "../Responses/ModerationUnavailableResponse";
import type { NoSuchProfileResponse } from "../Responses/NoSuchProfileResponse";
import { ProfileModeratedResponse } from "../Responses/ProfileModeratedResponse";

type Result =
  | ProfileModeratedResponse
  | NoSuchProfileResponse
  | ModerationForbiddenResponse
  | ModerationUnavailableResponse;

// Trust-level promotion, an admin's call by hand (SPEC.md §4). `moderateProfile` gates
// this on `profile.promote`, which `EvaluatePermissionHandler` grants only to `admin`.
export class PromoteMemberHandler implements IHandler<PromoteMemberRequest, Result> {
  constructor(
    private readonly profiles: IProfileAccessor,
    private readonly modActions: IModActionAccessor,
    private readonly auditLog: IAuditAccessor,
    private readonly reports: IReportAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: PromoteMemberRequest): Promise<Result> {
    const { correlationId, actor, profileId, timestamp } = request;
    const context = { correlationId, timestamp };

    const result = await moderateProfile(
      this.profiles,
      this.permissions,
      actor,
      profileId,
      "profile.promote",
      { trustLevel: "trusted" },
      context,
    );
    if (!("id" in result)) {
      return result;
    }

    const recorded = await recordModeration(
      this.modActions,
      this.auditLog,
      this.reports,
      {
        actorId: actorId(actor),
        action: "mark_trusted",
        target: { kind: "profile", id: profileId },
        reason: null,
        event: "mod.action",
        auditDetails: { action: "mark_trusted", targetProfileId: profileId },
      },
      context,
    );
    if (recorded !== undefined) {
      return recorded;
    }
    return new ProfileModeratedResponse(correlationId, result);
  }
}
