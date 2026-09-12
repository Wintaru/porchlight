import type { ICommentAccessor } from "../../../Accessors/CommentAccessor/ICommentAccessor";
import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import type { IReactionAccessor } from "../../../Accessors/ReactionAccessor/IReactionAccessor";
import type { Reaction } from "../../../Accessors/ReactionAccessor/Reaction";
import { RemoveReactionRequest } from "../../../Accessors/ReactionAccessor/Requests/RemoveReactionRequest";
import { StoreReactionRequest } from "../../../Accessors/ReactionAccessor/Requests/StoreReactionRequest";
import { ReactionExistsResponse } from "../../../Accessors/ReactionAccessor/Responses/ReactionExistsResponse";
import { ReactionNotFoundResponse } from "../../../Accessors/ReactionAccessor/Responses/ReactionNotFoundResponse";
import { ReactionRemovedResponse } from "../../../Accessors/ReactionAccessor/Responses/ReactionRemovedResponse";
import { ReactionStoredResponse } from "../../../Accessors/ReactionAccessor/Responses/ReactionStoredResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { ReactionTarget } from "../../../Common/ReactionTarget";
import type { RequestContext } from "../../../Common/RequestContext";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import type { PermissionSubject } from "../../../Engines/PermissionEngine/PermissionSubject";
import { commentSubjectOf, loadComment } from "../loadComment";
import { loadPost, postSubjectOf } from "../loadPost";
import { permit } from "../permit";
import type { ToggleReactionRequest } from "../Requests/ToggleReactionRequest";
import type { CommentForbiddenResponse } from "../Responses/CommentForbiddenResponse";
import { CommentUnavailableResponse } from "../Responses/CommentUnavailableResponse";
import { NoSuchReactionTargetResponse } from "../Responses/NoSuchReactionTargetResponse";
import { ReactionToggledResponse } from "../Responses/ReactionToggledResponse";
import { unavailable } from "../unavailable";

type ToggleReactionResult =
  | ReactionToggledResponse
  | NoSuchReactionTargetResponse
  | CommentForbiddenResponse
  | CommentUnavailableResponse;

// Add the reaction; when the store says it is already there, take it back instead. The
// per-member key decides, so two clicks in flight cannot double-count (D9).
export class ToggleReactionHandler implements IHandler<
  ToggleReactionRequest,
  ToggleReactionResult
> {
  constructor(
    private readonly reactions: IReactionAccessor,
    private readonly posts: IPostAccessor,
    private readonly comments: ICommentAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: ToggleReactionRequest): Promise<ToggleReactionResult> {
    const { correlationId, actor, target, kind, timestamp } = request;
    const context = { correlationId, timestamp };

    const subject = await this.subjectOf(target, context);
    if (subject instanceof CommentUnavailableResponse) {
      return subject;
    }
    if (subject === undefined) {
      return new NoSuchReactionTargetResponse(correlationId);
    }
    const refused = await permit(
      this.permissions,
      actor,
      "reaction.toggle",
      subject,
      context,
    );
    if (refused !== undefined) {
      return refused;
    }
    if (actor.kind !== "member") {
      return new CommentUnavailableResponse(
        correlationId,
        "reaction.toggle granted to a visitor",
      );
    }

    const reaction: Reaction = { target, profileId: actor.profile.id, kind };
    const stored = await this.reactions.store(
      new StoreReactionRequest(reaction, context),
    );
    if (stored instanceof ReactionStoredResponse) {
      return new ReactionToggledResponse(correlationId, target, kind, true);
    }
    if (!(stored instanceof ReactionExistsResponse)) {
      return unavailable(correlationId, stored, "store");
    }
    const removed = await this.reactions.remove(
      new RemoveReactionRequest(reaction, context),
    );
    if (
      removed instanceof ReactionRemovedResponse ||
      removed instanceof ReactionNotFoundResponse
    ) {
      // NotFound means another call took it back first; the state is the same.
      return new ReactionToggledResponse(correlationId, target, kind, false);
    }
    return unavailable(correlationId, removed, "remove");
  }

  // The item the reaction sits on, as the PermissionEngine sees it. A comment's subject
  // carries its post's status, so the rule can ask for a published post underneath.
  private async subjectOf(
    target: ReactionTarget,
    context: Required<Pick<RequestContext, "correlationId">>,
  ): Promise<PermissionSubject | undefined | CommentUnavailableResponse> {
    if (target.kind === "post") {
      const post = await loadPost(this.posts, target.id, context);
      return post instanceof CommentUnavailableResponse || post === undefined
        ? post
        : postSubjectOf(post);
    }
    const comment = await loadComment(this.comments, target.id, context);
    if (comment instanceof CommentUnavailableResponse || comment === undefined) {
      return comment;
    }
    const post = await loadPost(this.posts, comment.postId, context);
    return post instanceof CommentUnavailableResponse || post === undefined
      ? post
      : commentSubjectOf(comment, post.status);
  }
}
