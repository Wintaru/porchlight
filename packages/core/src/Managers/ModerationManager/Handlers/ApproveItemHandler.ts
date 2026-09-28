import type { IAuditAccessor } from "../../../Accessors/AuditAccessor/IAuditAccessor";
import type { ICommentAccessor } from "../../../Accessors/CommentAccessor/ICommentAccessor";
import type { IMemberBlockAccessor } from "../../../Accessors/MemberBlockAccessor/IMemberBlockAccessor";
import type { IModActionAccessor } from "../../../Accessors/ModActionAccessor/IModActionAccessor";
import type { INotificationAccessor } from "../../../Accessors/NotificationAccessor/INotificationAccessor";
import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import type { IReportAccessor } from "../../../Accessors/ReportAccessor/IReportAccessor";
import { BLOCKED_REPLY_TEXT } from "../../../Common/BlockedReplyText";
import type { IHandler } from "../../../Common/IHandler";
import type { IFollowerNoticeEngine } from "../../../Engines/FollowerNoticeEngine/IFollowerNoticeEngine";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { actorId } from "../actorId";
import type { LoadedItem } from "../LoadedItem";
import { isLoadedItem, loadItem, subjectOf } from "../loadItem";
import { authorNotice, replyNotice } from "../notificationsForItem";
import { notifyFollowers } from "../notifyFollowers";
import { permit } from "../permit";
import { recordModeration } from "../recordModeration";
import type { ApproveItemRequest } from "../Requests/ApproveItemRequest";
import type { ModerationForbiddenResponse } from "../Responses/ModerationForbiddenResponse";
import { ModerationItemResponse } from "../Responses/ModerationItemResponse";
import { ModerationUnavailableResponse } from "../Responses/ModerationUnavailableResponse";
import type { NoSuchItemResponse } from "../Responses/NoSuchItemResponse";
import { loadThreadHolds, type ThreadHolds } from "../threadHolds";
import { isItem, transitionItem } from "../transitionItem";

type Result =
  | ModerationItemResponse
  | NoSuchItemResponse
  | ModerationForbiddenResponse
  | ModerationUnavailableResponse;

const NO_THREAD: ThreadHolds = { parent: undefined, holds: [] };

// Publishes a post or shows a comment, clears any prior rejection reason, and closes
// the loop on any open report about it (SPEC.md §7). A comment whose writer the post's
// author or the answered comment's author blocked is rejected instead (#85, decision
// C2): the block may come after the comment went into the queue, and a comment that
// CreateComment would refuse today must not reach the blocker's post through the queue.
export class ApproveItemHandler implements IHandler<ApproveItemRequest, Result> {
  constructor(
    private readonly posts: IPostAccessor,
    private readonly comments: ICommentAccessor,
    private readonly modActions: IModActionAccessor,
    private readonly auditLog: IAuditAccessor,
    private readonly reports: IReportAccessor,
    private readonly notifications: INotificationAccessor,
    private readonly permissions: IPermissionEngine,
    private readonly memberBlocks: IMemberBlockAccessor,
    private readonly followerNotice: IFollowerNoticeEngine,
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

    let thread = NO_THREAD;
    if (item.kind === "comment") {
      const loaded = await loadThreadHolds(
        this.comments,
        this.memberBlocks,
        item,
        context,
      );
      if (loaded instanceof ModerationUnavailableResponse) {
        return loaded;
      }
      if (loaded.holds.some((hold) => hold.level === "block")) {
        return this.rejectBlocked(request, item);
      }
      thread = loaded;
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

    const notify = [...authorNotice(item, "item.approved"), ...replyNotice(item, thread)];
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
    // A post leaving the queue goes out for the first time, so its followers hear of
    // it (#24). Approving a post back from hidden is not news: they heard the first time.
    if (
      item.kind === "post" &&
      item.post.status === "pending" &&
      approved.kind === "post"
    ) {
      await notifyFollowers(this.followerNotice, approved.post, context);
    }
    return new ModerationItemResponse(correlationId, approved);
  }

  // The approval becomes a rejection with the same neutral text the comment form shows
  // (#23): the writer never learns who blocked them. The audit row says why, for staff.
  private async rejectBlocked(
    request: ApproveItemRequest,
    item: Extract<LoadedItem, { kind: "comment" }>,
  ): Promise<Result> {
    const { correlationId, actor, target, timestamp } = request;
    const context = { correlationId, timestamp };
    const reason = BLOCKED_REPLY_TEXT;
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
        auditDetails: { reason, cause: "blocked" },
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
