import type { ICommentAccessor } from "../../../Accessors/CommentAccessor/ICommentAccessor";
import { StoreCommentChangesRequest } from "../../../Accessors/CommentAccessor/Requests/StoreCommentChangesRequest";
import { CommentNotFoundResponse } from "../../../Accessors/CommentAccessor/Responses/CommentNotFoundResponse";
import { CommentStoredResponse } from "../../../Accessors/CommentAccessor/Responses/CommentStoredResponse";
import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import type { IHandler } from "../../../Common/IHandler";
import type { IContentRenderEngine } from "../../../Engines/ContentRenderEngine/IContentRenderEngine";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { commentSubjectOf, loadComment } from "../loadComment";
import { loadPost } from "../loadPost";
import { permit } from "../permit";
import { renderBody } from "../renderBody";
import type { EditCommentRequest } from "../Requests/EditCommentRequest";
import type { CommentForbiddenResponse } from "../Responses/CommentForbiddenResponse";
import { CommentRejectedResponse } from "../Responses/CommentRejectedResponse";
import { CommentResponse } from "../Responses/CommentResponse";
import { CommentUnavailableResponse } from "../Responses/CommentUnavailableResponse";
import { NoSuchCommentResponse } from "../Responses/NoSuchCommentResponse";
import { unavailable } from "../unavailable";

type EditCommentResult =
  | CommentResponse
  | NoSuchCommentResponse
  | CommentForbiddenResponse
  | CommentRejectedResponse
  | CommentUnavailableResponse;

// The author, or an admin, replaces the body through the one render path (D3). The
// status stays: an edit is not a second submission.
export class EditCommentHandler implements IHandler<
  EditCommentRequest,
  EditCommentResult
> {
  constructor(
    private readonly comments: ICommentAccessor,
    private readonly posts: IPostAccessor,
    private readonly content: IContentRenderEngine,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: EditCommentRequest): Promise<EditCommentResult> {
    const { correlationId, actor, commentId, timestamp } = request;
    const context = { correlationId, timestamp };

    const current = await loadComment(this.comments, commentId, context);
    if (current instanceof CommentUnavailableResponse) {
      return current;
    }
    if (current === undefined) {
      return new NoSuchCommentResponse(correlationId);
    }
    const post = await loadPost(this.posts, current.postId, context);
    if (post instanceof CommentUnavailableResponse) {
      return post;
    }
    if (post === undefined) {
      return new NoSuchCommentResponse(correlationId);
    }
    const refused = await permit(
      this.permissions,
      actor,
      "comment.edit",
      commentSubjectOf(current, post.status),
      context,
    );
    if (refused !== undefined) {
      return refused;
    }
    const bodyMd = request.bodyMd.trim();
    if (bodyMd === "") {
      return new CommentRejectedResponse(correlationId, "empty-body");
    }
    const bodyHtml = await renderBody(this.content, bodyMd, context);
    if (typeof bodyHtml !== "string") {
      return bodyHtml;
    }

    const stored = await this.comments.store(
      new StoreCommentChangesRequest(commentId, { bodyMd, bodyHtml }, context),
    );
    if (stored instanceof CommentStoredResponse) {
      return new CommentResponse(correlationId, stored.comment);
    }
    if (stored instanceof CommentNotFoundResponse) {
      return new NoSuchCommentResponse(correlationId);
    }
    return unavailable(correlationId, stored, "store");
  }
}
