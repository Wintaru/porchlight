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
import { authorNotice, replyNotice } from "../notificationsForItem";
import { permit } from "../permit";
import { recordModeration } from "../recordModeration";
import type { ApproveItemRequest } from "../Requests/ApproveItemRequest";
import type { ModerationForbiddenResponse } from "../Responses/ModerationForbiddenResponse";
import { ModerationItemResponse } from "../Responses/ModerationItemResponse";
import type { ModerationUnavailableResponse } from "../Responses/ModerationUnavailableResponse";
import type { NoSuchItemResponse } from "../Responses/NoSuchItemResponse";
import { isItem, transitionItem } from "../transitionItem";

type Result =
  | ModerationItemResponse
  | NoSuchItemResponse
  | ModerationForbiddenResponse
  | ModerationUnavailableResponse;

// Publishes a post or shows a comment, clears any prior rejection reason, and closes
// the loop on any open report about it (SPEC.md §7).
export class ApproveItemHandler implements IHandler<ApproveItemRequest, Result> {
  constructor(
    private readonly posts: IPostAccessor,
    private readonly comments: ICommentAccessor,
    private readonly modActions: IModActionAccessor,
    private readonly auditLog: IAuditAccessor,
    private readonly reports: IReportAccessor,
    private readonly notifications: INotificationAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: ApproveItemRequest): Promise<Result> {
    const { correlationId, actor, target, timestamp } = request;
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

    const approved = await transitionItem(
      this.posts,
      this.comments,
      target,
      { post: "published", comment: "visible" },
      null,
      context,
    );
    if (!isItem(approved)) {
      return approved;
    }

    const notify = [
      ...authorNotice(item, "item.approved"),
      ...(await replyNotice(this.comments, item, context)),
    ];
    const recorded = await recordModeration(
      this.modActions,
      this.auditLog,
      this.reports,
      this.notifications,
      {
        actorId: actorId(actor),
        action: "approve",
        target,
        reason: null,
        event: "item.approved",
        auditSubject: { kind: target.kind, id: target.id },
        auditDetails: {},
        resolveReportsFor: { target, status: "resolved" },
        notify,
      },
      context,
    );
    if (recorded !== undefined) {
      return recorded;
    }
    return new ModerationItemResponse(correlationId, approved);
  }
}
