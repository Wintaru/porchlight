import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { isPost, loadPost, subjectOf } from "../loadPost";
import { permit } from "../permit";
import type { GetPostRequest } from "../Requests/GetPostRequest";
import { NoSuchPostResponse } from "../Responses/NoSuchPostResponse";
import { PostForbiddenResponse } from "../Responses/PostForbiddenResponse";
import { PostResponse } from "../Responses/PostResponse";
import type { PostUnavailableResponse } from "../Responses/PostUnavailableResponse";

type GetPostResult = PostResponse | NoSuchPostResponse | PostUnavailableResponse;

// A post the actor may not view answers NoSuchPost, not Forbidden: a draft's existence
// is the author's business.
export class GetPostHandler implements IHandler<GetPostRequest, GetPostResult> {
  constructor(
    private readonly posts: IPostAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: GetPostRequest): Promise<GetPostResult> {
    const { correlationId, actor, selector } = request;
    const context = { correlationId };

    const post = await loadPost(this.posts, selector, context);
    if (!isPost(post)) {
      return post;
    }
    const refused = await permit(
      this.permissions,
      actor,
      "post.view",
      subjectOf(post),
      context,
    );
    if (refused instanceof PostForbiddenResponse) {
      return new NoSuchPostResponse(correlationId);
    }
    if (refused !== undefined) {
      return refused;
    }
    return new PostResponse(correlationId, post);
  }
}
