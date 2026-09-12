import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import { LoadPostsByAuthorRequest } from "../../../Accessors/PostAccessor/Requests/LoadPostsByAuthorRequest";
import { PostsLoadedResponse } from "../../../Accessors/PostAccessor/Responses/PostsLoadedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { permit } from "../permit";
import type { ListPostsForAuthorRequest } from "../Requests/ListPostsForAuthorRequest";
import type { PostForbiddenResponse } from "../Responses/PostForbiddenResponse";
import { PostsResponse } from "../Responses/PostsResponse";
import type { PostUnavailableResponse } from "../Responses/PostUnavailableResponse";
import { unavailable } from "../unavailable";

type ListPostsResult = PostsResponse | PostForbiddenResponse | PostUnavailableResponse;

export class ListPostsForAuthorHandler implements IHandler<
  ListPostsForAuthorRequest,
  ListPostsResult
> {
  constructor(
    private readonly posts: IPostAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: ListPostsForAuthorRequest): Promise<ListPostsResult> {
    const { correlationId, actor, profileId } = request;
    const context = { correlationId };

    const refused = await permit(
      this.permissions,
      actor,
      "post.list",
      { kind: "profile", id: profileId },
      context,
    );
    if (refused !== undefined) {
      return refused;
    }
    const loaded = await this.posts.load(
      new LoadPostsByAuthorRequest(profileId, context),
    );
    if (loaded instanceof PostsLoadedResponse) {
      return new PostsResponse(correlationId, loaded.posts);
    }
    return unavailable(correlationId, loaded, "load");
  }
}
