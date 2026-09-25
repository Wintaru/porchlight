import type { ICommentAccessor } from "../../../Accessors/CommentAccessor/ICommentAccessor";
import type { NewComment } from "../../../Accessors/CommentAccessor/NewComment";
import { StoreNewCommentRequest } from "../../../Accessors/CommentAccessor/Requests/StoreNewCommentRequest";
import { CommentStoredResponse } from "../../../Accessors/CommentAccessor/Responses/CommentStoredResponse";
import type { INotificationAccessor } from "../../../Accessors/NotificationAccessor/INotificationAccessor";
import { RecordNotificationRequest } from "../../../Accessors/NotificationAccessor/Requests/RecordNotificationRequest";
import { NotificationStoredResponse } from "../../../Accessors/NotificationAccessor/Responses/NotificationStoredResponse";
import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import type { Actor } from "../../../Common/Actor";
import type { IHandler } from "../../../Common/IHandler";
import type { IContentRenderEngine } from "../../../Engines/ContentRenderEngine/IContentRenderEngine";
import type { IEvidenceEngine } from "../../../Engines/EvidenceEngine/IEvidenceEngine";
import { RecordTextEvidenceRequest } from "../../../Engines/EvidenceEngine/Requests/RecordTextEvidenceRequest";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { loadPost, postSubjectOf } from "../loadPost";
import { notifyStaffOfPendingComment } from "../notifyStaff";
import { permit } from "../permit";
import { isPlacement, place } from "../placeComment";
import { renderBody } from "../renderBody";
import type { CreateCommentRequest } from "../Requests/CreateCommentRequest";
import type { CommentForbiddenResponse } from "../Responses/CommentForbiddenResponse";
import { CommentRejectedResponse } from "../Responses/CommentRejectedResponse";
import { CommentResponse } from "../Responses/CommentResponse";
import { CommentUnavailableResponse } from "../Responses/CommentUnavailableResponse";
import { unavailable } from "../unavailable";
import { recordEvidence } from "../recordEvidence";

type CreateCommentResult =
  | CommentResponse
  | CommentForbiddenResponse
  | CommentRejectedResponse
  | CommentUnavailableResponse;

// Permission (the post's switch and the site's `comments` key, D20), then the parent
// and the depth rule (D10, in `placeComment.ts`, shared with the anonymous flow),
// then the render, then the write. Trust decides the status (SPEC.md §4).
export class CreateCommentHandler implements IHandler<
  CreateCommentRequest,
  CreateCommentResult
> {
  constructor(
    private readonly comments: ICommentAccessor,
    private readonly posts: IPostAccessor,
    private readonly profiles: IProfileAccessor,
    private readonly content: IContentRenderEngine,
    private readonly notifications: INotificationAccessor,
    private readonly permissions: IPermissionEngine,
    private readonly evidence: IEvidenceEngine,
  ) {}

  async handle(request: CreateCommentRequest): Promise<CreateCommentResult> {
    const { correlationId, actor, draft, origin, timestamp } = request;
    // One clock for the whole call: the store stamps the row with the request's time.
    const context = { correlationId, timestamp };

    const post = await loadPost(this.posts, draft.postId, context);
    if (post instanceof CommentUnavailableResponse) {
      return post;
    }
    if (post === undefined) {
      return new CommentRejectedResponse(correlationId, "no-such-post");
    }
    const refused = await permit(
      this.permissions,
      actor,
      "comment.create",
      postSubjectOf(post),
      context,
    );
    if (refused !== undefined) {
      return refused;
    }
    if (actor.kind !== "member") {
      // The rule above already refused a visitor; this narrows the type for the author.
      return new CommentUnavailableResponse(
        correlationId,
        "comment.create granted to a visitor",
      );
    }
    const bodyMd = draft.bodyMd.trim();
    if (bodyMd === "") {
      return new CommentRejectedResponse(correlationId, "empty-body");
    }

    const placed = await place(
      this.comments,
      this.profiles,
      draft.parentId,
      post.id,
      bodyMd,
      context,
    );
    if (!isPlacement(placed)) {
      return placed;
    }
    const bodyHtml = await renderBody(this.content, placed.bodyMd, context);
    if (typeof bodyHtml !== "string") {
      return bodyHtml;
    }

    const comment: NewComment = {
      postId: post.id,
      parentId: placed.parentId,
      author: { kind: "member", profileId: actor.profile.id },
      bodyMd: placed.bodyMd,
      bodyHtml,
      status: publishesAtOnce(actor) ? "visible" : "pending",
    };
    const stored = await this.comments.store(
      new StoreNewCommentRequest(comment, context),
    );
    if (!(stored instanceof CommentStoredResponse)) {
      return unavailable(correlationId, stored, "store");
    }
    await recordEvidence(
      this.evidence,
      new RecordTextEvidenceRequest(
        { kind: "comment", id: stored.comment.id },
        comment.author,
        null,
        origin,
        "not_required",
        comment.bodyMd,
        context,
      ),
    );

    // `queue.pending` tells staff a probation reply is waiting; `reply.created` tells a
    // trusted member's reply is visible at once — never both for the same comment
    // (SPEC.md §8).
    if (comment.status === "pending") {
      const notified = await notifyStaffOfPendingComment(
        this.profiles,
        this.notifications,
        post.id,
        stored.comment.id,
        context,
      );
      if (notified !== undefined) {
        return notified;
      }
    } else if (
      placed.parentAuthor?.kind === "member" &&
      placed.parentAuthor.profileId !== actor.profile.id
    ) {
      const notified = await this.notifications.store(
        new RecordNotificationRequest(
          placed.parentAuthor.profileId,
          "reply.created",
          { postId: post.id, commentId: stored.comment.id },
          {},
          context,
        ),
      );
      if (!(notified instanceof NotificationStoredResponse)) {
        return unavailable(correlationId, notified, "notifications.store");
      }
    }
    return new CommentResponse(correlationId, stored.comment);
  }
}

// Trust decides (SPEC.md §4). Staff are trusted by definition.
function publishesAtOnce(actor: Actor & { readonly kind: "member" }): boolean {
  return actor.profile.trustLevel === "trusted" || actor.profile.role !== "member";
}
