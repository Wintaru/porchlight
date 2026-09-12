import type { CommentReadership } from "../../../Accessors/CommentAccessor/CommentReadership";
import type { ICommentAccessor } from "../../../Accessors/CommentAccessor/ICommentAccessor";
import { LoadCommentsForPostRequest as LoadCommentsRequest } from "../../../Accessors/CommentAccessor/Requests/LoadCommentsForPostRequest";
import { CommentsLoadedResponse } from "../../../Accessors/CommentAccessor/Responses/CommentsLoadedResponse";
import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import type { Actor } from "../../../Common/Actor";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { buildCommentTree } from "../buildCommentTree";
import { loadPost, postSubjectOf } from "../loadPost";
import { permit } from "../permit";
import type { ListCommentsForPostRequest } from "../Requests/ListCommentsForPostRequest";
import type { CommentForbiddenResponse } from "../Responses/CommentForbiddenResponse";
import { CommentRejectedResponse } from "../Responses/CommentRejectedResponse";
import { CommentsResponse } from "../Responses/CommentsResponse";
import { CommentUnavailableResponse } from "../Responses/CommentUnavailableResponse";
import { unavailable } from "../unavailable";

type ListCommentsResult =
  | CommentsResponse
  | CommentRejectedResponse
  | CommentForbiddenResponse
  | CommentUnavailableResponse;

// The tree for whoever may view the post (the `post.view` rule), cut to what they may
// read at the store: the same wall the browser's comment policies draw.
export class ListCommentsForPostHandler implements IHandler<
  ListCommentsForPostRequest,
  ListCommentsResult
> {
  constructor(
    private readonly comments: ICommentAccessor,
    private readonly posts: IPostAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: ListCommentsForPostRequest): Promise<ListCommentsResult> {
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
      "post.view",
      postSubjectOf(post),
      context,
    );
    if (refused !== undefined) {
      return refused;
    }
    const loaded = await this.comments.load(
      new LoadCommentsRequest(postId, readershipOf(actor), context),
    );
    if (loaded instanceof CommentsLoadedResponse) {
      return new CommentsResponse(correlationId, buildCommentTree(loaded.comments));
    }
    return unavailable(correlationId, loaded, "load");
  }
}

function readershipOf(actor: Actor): CommentReadership {
  if (actor.kind === "visitor") {
    return { kind: "public" };
  }
  if (actor.profile.role === "admin") {
    return { kind: "all" };
  }
  return { kind: "member", profileId: actor.profile.id };
}
