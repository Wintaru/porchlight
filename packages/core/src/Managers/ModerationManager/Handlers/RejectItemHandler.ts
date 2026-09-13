import type { IAuditAccessor } from "../../../Accessors/AuditAccessor/IAuditAccessor";
import type { ICommentAccessor } from "../../../Accessors/CommentAccessor/ICommentAccessor";
import type { IModActionAccessor } from "../../../Accessors/ModActionAccessor/IModActionAccessor";
import type { INotificationAccessor } from "../../../Accessors/NotificationAccessor/INotificationAccessor";
import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import type { IReportAccessor } from "../../../Accessors/ReportAccessor/IReportAccessor";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { actorId } from "../actorId";
import { isLoadedItem, loadItem, subjectOf } from "../loadItem";
import { authorNotice } from "../notificationsForItem";
import { permit } from "../permit";
import { recordModeration } from "../recordModeration";
import type { RejectItemRequest } from "../Requests/RejectItemRequest";
import type { ModerationForbiddenResponse } from "../Responses/ModerationForbiddenResponse";
import { ModerationItemResponse } from "../Responses/ModerationItemResponse";
import type { ModerationUnavailableResponse } from "../Responses/ModerationUnavailableResponse";
import type { NoSuchItemResponse } from "../Responses/NoSuchItemResponse";
import { ReasonRequiredResponse } from "../Responses/ReasonRequiredResponse";
import { isItem, transitionItem } from "../transitionItem";

type Result =
  | ModerationItemResponse
  | NoSuchItemResponse
  | ModerationForbiddenResponse
  | ReasonRequiredResponse
  | ModerationUnavailableResponse;

// Rejects a post or comment with a reason the author sees (SPEC.md §7: "Done when" —
// the acceptance test for probation rejection). The reason is required.
export class RejectItemHandler implements IHandler<RejectItemRequest, Result> {
  constructor(
    private readonly posts: IPostAccessor,
    private readonly comments: ICommentAccessor,
    private readonly modActions: IModActionAccessor,
    private readonly auditLog: IAuditAccessor,
    private readonly reports: IReportAccessor,
    private readonly notifications: INotificationAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: RejectItemRequest): Promise<Result> {
    const { correlationId, actor, target, timestamp } = request;
    const context = { correlationId, timestamp };
    const reason = request.reason.trim();
    if (reason === "") {
      return new ReasonRequiredResponse(correlationId);
    }

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

    const rejected = await transitionItem(
      this.posts,
      this.comments,
      target,
      { post: "rejected", comment: "rejected" },
      reason,
      context,
    );
    if (!isItem(rejected)) {
      return rejected;
    }

    const recorded = await recordModeration(
      this.modActions,
      this.auditLog,
      this.reports,
      this.notifications,
      {
        actorId: actorId(actor),
        action: "reject",
        target,
        reason,
        event: "item.rejected",
        auditSubject: { kind: target.kind, id: target.id },
        auditDetails: { reason },
        resolveReportsFor: { target, status: "resolved" },
        notify: authorNotice(item, "item.rejected", { reason }),
      },
      context,
    );
    if (recorded !== undefined) {
      return recorded;
    }
    return new ModerationItemResponse(correlationId, rejected);
  }
}
