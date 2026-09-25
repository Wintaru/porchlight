import type { ICommentAccessor } from "../../../Accessors/CommentAccessor/ICommentAccessor";
import type { NewComment } from "../../../Accessors/CommentAccessor/NewComment";
import { StoreNewCommentRequest } from "../../../Accessors/CommentAccessor/Requests/StoreNewCommentRequest";
import { CommentStoredResponse } from "../../../Accessors/CommentAccessor/Responses/CommentStoredResponse";
import type { INotificationAccessor } from "../../../Accessors/NotificationAccessor/INotificationAccessor";
import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import type { IHandler } from "../../../Common/IHandler";
import type { IAnonymousGuardEngine } from "../../../Engines/AnonymousGuardEngine/IAnonymousGuardEngine";
import { AdmitAnonymousSubmissionRequest } from "../../../Engines/AnonymousGuardEngine/Requests/AdmitAnonymousSubmissionRequest";
import { AnonymousAdmittedResponse } from "../../../Engines/AnonymousGuardEngine/Responses/AnonymousAdmittedResponse";
import { AnonymousGuardDeniedResponse } from "../../../Engines/AnonymousGuardEngine/Responses/AnonymousGuardDeniedResponse";
import type { IContentRenderEngine } from "../../../Engines/ContentRenderEngine/IContentRenderEngine";
import type { IEvidenceEngine } from "../../../Engines/EvidenceEngine/IEvidenceEngine";
import { RecordTextEvidenceRequest } from "../../../Engines/EvidenceEngine/Requests/RecordTextEvidenceRequest";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { loadPost, postSubjectOf } from "../loadPost";
import { notifyStaffOfPendingComment } from "../notifyStaff";
import { permit } from "../permit";
import { isPlacement, place } from "../placeComment";
import { renderBody } from "../renderBody";
import type { CreateAnonymousCommentRequest } from "../Requests/CreateAnonymousCommentRequest";
import { AnonymousCommentCreatedResponse } from "../Responses/AnonymousCommentCreatedResponse";
import type { CommentForbiddenResponse } from "../Responses/CommentForbiddenResponse";
import { CommentGuardRefusedResponse } from "../Responses/CommentGuardRefusedResponse";
import { CommentRejectedResponse } from "../Responses/CommentRejectedResponse";
import { CommentUnavailableResponse } from "../Responses/CommentUnavailableResponse";
import { unavailable } from "../unavailable";
import { recordEvidence } from "../recordEvidence";

type CreateAnonymousCommentResult =
  | AnonymousCommentCreatedResponse
  | CommentForbiddenResponse
  | CommentGuardRefusedResponse
  | CommentRejectedResponse
  | CommentUnavailableResponse;

// The D20 permission gate, then the D15 admission guard, then the same placement and
// depth rule (D10) a member's comment takes, then the write. Always lands `pending`
// (SPEC.md §4): an anonymous author has no trust level to publish at once.
export class CreateAnonymousCommentHandler implements IHandler<
  CreateAnonymousCommentRequest,
  CreateAnonymousCommentResult
> {
  constructor(
    private readonly comments: ICommentAccessor,
    private readonly posts: IPostAccessor,
    private readonly profiles: IProfileAccessor,
    private readonly content: IContentRenderEngine,
    private readonly notifications: INotificationAccessor,
    private readonly permissions: IPermissionEngine,
    private readonly guard: IAnonymousGuardEngine,
    private readonly evidence: IEvidenceEngine,
  ) {}

  async handle(
    request: CreateAnonymousCommentRequest,
  ): Promise<CreateAnonymousCommentResult> {
    const { correlationId, actor, draft, submission, timestamp } = request;
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
      "comment.create.anonymous",
      postSubjectOf(post),
      context,
    );
    if (refused !== undefined) {
      return refused;
    }
    const bodyMd = draft.bodyMd.trim();
    if (bodyMd === "") {
      return new CommentRejectedResponse(correlationId, "empty-body");
    }

    const admitted = await this.guard.evaluate(
      new AdmitAnonymousSubmissionRequest("comment", submission, context),
    );
    if (admitted instanceof AnonymousGuardDeniedResponse) {
      return new CommentGuardRefusedResponse(correlationId, admitted.reason);
    }
    if (!(admitted instanceof AnonymousAdmittedResponse)) {
      return unavailable(correlationId, admitted, "guard.evaluate");
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
      author: { kind: "anonymous", anonymousAuthorId: admitted.author.id },
      bodyMd: placed.bodyMd,
      bodyHtml,
      status: "pending",
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
        submission,
        "pass",
        comment.bodyMd,
        context,
      ),
    );
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
    return new AnonymousCommentCreatedResponse(
      correlationId,
      stored.comment,
      admitted.secret,
      admitted.isNewAuthor,
    );
  }
}
