import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { loadPost, postSubjectOf } from "../loadPost";
import { permit } from "../permit";
import type { CheckCanCommentAnonymouslyRequest } from "../Requests/CheckCanCommentAnonymouslyRequest";
import { CanCommentResponse } from "../Responses/CanCommentResponse";
import { CannotCommentResponse } from "../Responses/CannotCommentResponse";
import { CommentForbiddenResponse } from "../Responses/CommentForbiddenResponse";
import { CommentRejectedResponse } from "../Responses/CommentRejectedResponse";
import { CommentUnavailableResponse } from "../Responses/CommentUnavailableResponse";

type CheckCanCommentAnonymouslyResult =
  | CanCommentResponse
  | CannotCommentResponse
  | CommentRejectedResponse
  | CommentUnavailableResponse;

// Same shape as CheckCanCommentHandler, asked ahead of time so the post page can
// decide between the member form, the anonymous form and "sign in to comment" (D20).
export class CheckCanCommentAnonymouslyHandler implements IHandler<
  CheckCanCommentAnonymouslyRequest,
  CheckCanCommentAnonymouslyResult
> {
  constructor(
    private readonly posts: IPostAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(
    request: CheckCanCommentAnonymouslyRequest,
  ): Promise<CheckCanCommentAnonymouslyResult> {
    const { correlationId, actor, postId } = request;
    const context = { correlationId };

    const post = await loadPost(this.posts, postId, context);
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
    if (refused === undefined) {
      return new CanCommentResponse(correlationId);
    }
    if (refused instanceof CommentForbiddenResponse) {
      return new CannotCommentResponse(correlationId, refused.reason);
    }
    return refused;
  }
}
