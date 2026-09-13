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
import type { RemoveItemRequest } from "../Requests/RemoveItemRequest";
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

// Removes a post or comment (SPEC.md §7): unlike the author's own delete, the row and
// its content stay for the record — status alone hides it. A tombstone is a different,
// author-initiated erasure (D5) this action never produces.
export class RemoveItemHandler implements IHandler<RemoveItemRequest, Result> {
  constructor(
    private readonly posts: IPostAccessor,
    private readonly comments: ICommentAccessor,
    private readonly modActions: IModActionAccessor,
    private readonly auditLog: IAuditAccessor,
    private readonly reports: IReportAccessor,
    private readonly notifications: INotificationAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: RemoveItemRequest): Promise<Result> {
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

    const removed = await transitionItem(
      this.posts,
      this.comments,
      target,
      { post: "removed", comment: "removed" },
      null,
      context,
    );
    if (!isItem(removed)) {
      return removed;
    }

    const recorded = await recordModeration(
      this.modActions,
      this.auditLog,
      this.reports,
      this.notifications,
      {
        actorId: actorId(actor),
        action: "remove",
        target,
        reason,
        event: "mod.action",
        auditSubject: { kind: target.kind, id: target.id },
        auditDetails: { action: "remove", reason },
        resolveReportsFor: { target, status: "resolved" },
        notify: authorNotice(item, "mod.action", { action: "remove", reason }),
      },
      context,
    );
    if (recorded !== undefined) {
      return recorded;
    }
    return new ModerationItemResponse(correlationId, removed);
  }
}
