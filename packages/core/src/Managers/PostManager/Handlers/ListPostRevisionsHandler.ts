import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import { LoadPostRevisionsRequest } from "../../../Accessors/PostAccessor/Requests/LoadPostRevisionsRequest";
import { PostRevisionsLoadedResponse } from "../../../Accessors/PostAccessor/Responses/PostRevisionsLoadedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { isPost, loadPost, subjectOf } from "../loadPost";
import { permit } from "../permit";
import type { ListPostRevisionsRequest } from "../Requests/ListPostRevisionsRequest";
import { NoSuchPostResponse } from "../Responses/NoSuchPostResponse";
import { PostForbiddenResponse } from "../Responses/PostForbiddenResponse";
import { PostRevisionsResponse } from "../Responses/PostRevisionsResponse";
import type { PostUnavailableResponse } from "../Responses/PostUnavailableResponse";
import { unavailable } from "../unavailable";

type Result =
  | PostRevisionsResponse
  | NoSuchPostResponse
  | PostForbiddenResponse
  | PostUnavailableResponse;

// Load, the editor's permission, then the history. A refusal for a post the actor may
// not edit reads as "no such post", so the history page never confirms a post exists.
export class ListPostRevisionsHandler implements IHandler<
  ListPostRevisionsRequest,
  Result
> {
  constructor(
    private readonly posts: IPostAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: ListPostRevisionsRequest): Promise<Result> {
    const { correlationId, actor, postId } = request;
    const context = { correlationId };

    const post = await loadPost(this.posts, { by: "id", id: postId }, context);
    if (!isPost(post)) {
      return post;
    }
    const refused = await permit(
      this.permissions,
      actor,
      "post.edit",
      subjectOf(post),
      context,
    );
    if (refused instanceof PostForbiddenResponse) {
      return refused.reason === "signed-out"
        ? refused
        : new NoSuchPostResponse(correlationId);
    }
    if (refused !== undefined) {
      return refused;
    }
    const loaded = await this.posts.load(new LoadPostRevisionsRequest(postId, context));
    if (!(loaded instanceof PostRevisionsLoadedResponse)) {
      return unavailable(correlationId, loaded, "posts.load");
    }
    return new PostRevisionsResponse(correlationId, post, loaded.revisions);
  }
}
