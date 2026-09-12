import type { ICommentAccessor } from "../../../Accessors/CommentAccessor/ICommentAccessor";
import { RemoveCommentRequest } from "../../../Accessors/CommentAccessor/Requests/RemoveCommentRequest";
import { StoreCommentTombstoneRequest } from "../../../Accessors/CommentAccessor/Requests/StoreCommentTombstoneRequest";
import { CommentHasRepliesResponse } from "../../../Accessors/CommentAccessor/Responses/CommentHasRepliesResponse";
import { CommentNotFoundResponse } from "../../../Accessors/CommentAccessor/Responses/CommentNotFoundResponse";
import { CommentRemovedResponse } from "../../../Accessors/CommentAccessor/Responses/CommentRemovedResponse";
import { CommentStoredResponse } from "../../../Accessors/CommentAccessor/Responses/CommentStoredResponse";
import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { commentSubjectOf, loadComment } from "../loadComment";
import { loadPost } from "../loadPost";
import { permit } from "../permit";
import type { DeleteCommentRequest } from "../Requests/DeleteCommentRequest";
import { CommentDeletedResponse } from "../Responses/CommentDeletedResponse";
import type { CommentForbiddenResponse } from "../Responses/CommentForbiddenResponse";
import { CommentUnavailableResponse } from "../Responses/CommentUnavailableResponse";
import { NoSuchCommentResponse } from "../Responses/NoSuchCommentResponse";
import { unavailable } from "../unavailable";

type DeleteCommentResult =
  | CommentDeletedResponse
  | NoSuchCommentResponse
  | CommentForbiddenResponse
  | CommentUnavailableResponse;

// Hard delete first. The store refuses when replies still point at the comment, and
// then the comment becomes a tombstone so those replies keep their place (D5).
export class DeleteCommentHandler implements IHandler<
  DeleteCommentRequest,
  DeleteCommentResult
> {
  constructor(
    private readonly comments: ICommentAccessor,
    private readonly posts: IPostAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: DeleteCommentRequest): Promise<DeleteCommentResult> {
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
      "comment.delete",
      commentSubjectOf(current, post.status),
      context,
    );
    if (refused !== undefined) {
      return refused;
    }

    const removed = await this.comments.remove(
      new RemoveCommentRequest(commentId, context),
    );
    if (removed instanceof CommentRemovedResponse) {
      return new CommentDeletedResponse(correlationId, "removed");
    }
    if (removed instanceof CommentNotFoundResponse) {
      return new NoSuchCommentResponse(correlationId);
    }
    if (!(removed instanceof CommentHasRepliesResponse)) {
      return unavailable(correlationId, removed, "remove");
    }
    const tombstoned = await this.comments.store(
      new StoreCommentTombstoneRequest(commentId, context),
    );
    if (tombstoned instanceof CommentStoredResponse) {
      return new CommentDeletedResponse(correlationId, "tombstoned");
    }
    if (tombstoned instanceof CommentNotFoundResponse) {
      return new NoSuchCommentResponse(correlationId);
    }
    return unavailable(correlationId, tombstoned, "store");
  }
}
