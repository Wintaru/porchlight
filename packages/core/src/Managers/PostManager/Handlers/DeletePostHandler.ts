import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import { RemovePostRequest } from "../../../Accessors/PostAccessor/Requests/RemovePostRequest";
import { PostNotFoundResponse } from "../../../Accessors/PostAccessor/Responses/PostNotFoundResponse";
import { PostRemovedResponse } from "../../../Accessors/PostAccessor/Responses/PostRemovedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { isPost, loadPost, subjectOf } from "../loadPost";
import { permit } from "../permit";
import type { DeletePostRequest } from "../Requests/DeletePostRequest";
import { NoSuchPostResponse } from "../Responses/NoSuchPostResponse";
import { PostDeletedResponse } from "../Responses/PostDeletedResponse";
import type { PostForbiddenResponse } from "../Responses/PostForbiddenResponse";
import type { PostUnavailableResponse } from "../Responses/PostUnavailableResponse";
import { unavailable } from "../unavailable";

type DeletePostResult =
  | PostDeletedResponse
  | NoSuchPostResponse
  | PostForbiddenResponse
  | PostUnavailableResponse;

export class DeletePostHandler implements IHandler<DeletePostRequest, DeletePostResult> {
  constructor(
    private readonly posts: IPostAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: DeletePostRequest): Promise<DeletePostResult> {
    const { correlationId, actor, postId } = request;
    const context = { correlationId };

    const current = await loadPost(this.posts, { by: "id", id: postId }, context);
    if (!isPost(current)) {
      return current;
    }
    const refused = await permit(
      this.permissions,
      actor,
      "post.delete",
      subjectOf(current),
      context,
    );
    if (refused !== undefined) {
      return refused;
    }

    const removed = await this.posts.remove(new RemovePostRequest(postId, context));
    if (removed instanceof PostRemovedResponse) {
      return new PostDeletedResponse(correlationId);
    }
    if (removed instanceof PostNotFoundResponse) {
      return new NoSuchPostResponse(correlationId);
    }
    return unavailable(correlationId, removed, "remove");
  }
}
