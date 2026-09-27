import type { IMemberBlockAccessor } from "../../../Accessors/MemberBlockAccessor/IMemberBlockAccessor";
import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { loadBlocksAgainst } from "../loadBlocksAgainst";
import { loadPost, postSubjectOf } from "../loadPost";
import { permit } from "../permit";
import type { CheckCanCommentRequest } from "../Requests/CheckCanCommentRequest";
import { CanCommentResponse } from "../Responses/CanCommentResponse";
import { CannotCommentResponse } from "../Responses/CannotCommentResponse";
import { CommentForbiddenResponse } from "../Responses/CommentForbiddenResponse";
import { CommentRejectedResponse } from "../Responses/CommentRejectedResponse";
import { CommentUnavailableResponse } from "../Responses/CommentUnavailableResponse";

type CheckCanCommentResult =
  | CanCommentResponse
  | CannotCommentResponse
  | CommentRejectedResponse
  | CommentUnavailableResponse;

// The same rule CreateComment applies, asked ahead of time so the form can hide (D20).
// A member the post's author blocked (#23) gets `not-allowed`, the same closed form as
// any other refusal: the page never says who blocked whom.
export class CheckCanCommentHandler implements IHandler<
  CheckCanCommentRequest,
  CheckCanCommentResult
> {
  constructor(
    private readonly posts: IPostAccessor,
    private readonly permissions: IPermissionEngine,
    private readonly memberBlocks: IMemberBlockAccessor,
  ) {}

  async handle(request: CheckCanCommentRequest): Promise<CheckCanCommentResult> {
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
      "comment.create",
      postSubjectOf(post),
      context,
    );
    if (refused === undefined) {
      if (actor.kind !== "member") {
        return new CanCommentResponse(correlationId);
      }
      const against = await loadBlocksAgainst(
        this.memberBlocks,
        actor.profile.id,
        [post.author],
        context,
      );
      if (against instanceof CommentUnavailableResponse) {
        return against;
      }
      return against.some((block) => block.level === "block")
        ? new CannotCommentResponse(correlationId, "not-allowed")
        : new CanCommentResponse(correlationId);
    }
    if (refused instanceof CommentForbiddenResponse) {
      return new CannotCommentResponse(correlationId, refused.reason);
    }
    return refused;
  }
}
