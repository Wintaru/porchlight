import type { IAuditAccessor } from "../../../Accessors/AuditAccessor/IAuditAccessor";
import type { ICommentAccessor } from "../../../Accessors/CommentAccessor/ICommentAccessor";
import type { IModActionAccessor } from "../../../Accessors/ModActionAccessor/IModActionAccessor";
import type { INotificationAccessor } from "../../../Accessors/NotificationAccessor/INotificationAccessor";
import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import type { IReportAccessor } from "../../../Accessors/ReportAccessor/IReportAccessor";
import type { Actor } from "../../../Common/Actor";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { actorId } from "../actorId";
import { isLoadedItem, loadItem, subjectOf } from "../loadItem";
import { permit } from "../permit";
import { recordModeration } from "../recordModeration";
import type { DismissReportsRequest } from "../Requests/DismissReportsRequest";
import type { ModerationForbiddenResponse } from "../Responses/ModerationForbiddenResponse";
import { ModerationItemResponse } from "../Responses/ModerationItemResponse";
import type { ModerationUnavailableResponse } from "../Responses/ModerationUnavailableResponse";
import type { NoSuchItemResponse } from "../Responses/NoSuchItemResponse";
import { itemOf } from "../transitionItem";

type Result =
  | ModerationItemResponse
  | NoSuchItemResponse
  | ModerationForbiddenResponse
  | ModerationUnavailableResponse;

// Closes the reports on an item a moderator found nothing wrong with (#40). The item's
// own status is untouched; the mod_actions and audit rows say who dismissed them. An
// escalated report — every illegal-content report starts escalated — asked for a senior
// look, so only an admin's Dismiss closes one; a moderator's closes the open ones.
export class DismissReportsHandler implements IHandler<DismissReportsRequest, Result> {
  constructor(
    private readonly posts: IPostAccessor,
    private readonly comments: ICommentAccessor,
    private readonly modActions: IModActionAccessor,
    private readonly auditLog: IAuditAccessor,
    private readonly reports: IReportAccessor,
    private readonly notifications: INotificationAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: DismissReportsRequest): Promise<Result> {
    const { correlationId, actor, target, reason, timestamp } = request;
    const context = { correlationId, timestamp };

    const item = await loadItem(this.posts, this.comments, target, context);
    if (!isLoadedItem(item)) {
      return item;
    }
    const refused = await permit(
      this.permissions,
      actor,
      "moderation.act",
      subjectOf(item),
      context,
    );
    if (refused !== undefined) {
      return refused;
    }

    const recorded = await recordModeration(
      this.modActions,
      this.auditLog,
      this.reports,
      this.notifications,
      {
        actorId: actorId(actor),
        action: "dismiss_reports",
        target,
        reason,
        event: "mod.action",
        auditSubject: { kind: target.kind, id: target.id },
        auditDetails: { action: "dismiss_reports", reason },
        resolveReportsFor: {
          target,
          status: "dismissed",
          closing: isAdmin(actor) ? ["open", "escalated"] : ["open"],
        },
      },
      context,
    );
    if (recorded !== undefined) {
      return recorded;
    }
    return new ModerationItemResponse(correlationId, itemOf(item));
  }
}

function isAdmin(actor: Actor): boolean {
  return actor.kind === "member" && actor.profile.role === "admin";
}
