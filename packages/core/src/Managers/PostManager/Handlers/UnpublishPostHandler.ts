import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import { StorePostChangesRequest } from "../../../Accessors/PostAccessor/Requests/StorePostChangesRequest";
import { PostNotFoundResponse } from "../../../Accessors/PostAccessor/Responses/PostNotFoundResponse";
import { PostStoredResponse } from "../../../Accessors/PostAccessor/Responses/PostStoredResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { isPost, loadPost, subjectOf } from "../loadPost";
import { permit } from "../permit";
import type { UnpublishPostRequest } from "../Requests/UnpublishPostRequest";
import { NoSuchPostResponse } from "../Responses/NoSuchPostResponse";
import type { PostForbiddenResponse } from "../Responses/PostForbiddenResponse";
import { PostNotPublishableResponse } from "../Responses/PostNotPublishableResponse";
import { PostResponse } from "../Responses/PostResponse";
import type { PostUnavailableResponse } from "../Responses/PostUnavailableResponse";
import { unavailable } from "../unavailable";

type UnpublishPostResult =
  | PostResponse
  | NoSuchPostResponse
  | PostForbiddenResponse
  | PostNotPublishableResponse
  | PostUnavailableResponse;

// `published` or `pending` back to `draft`. A draft stays a draft. A post a moderator
// took down is not the author's to move, and answers NotPublishable with its status.
export class UnpublishPostHandler implements IHandler<
  UnpublishPostRequest,
  UnpublishPostResult
> {
  constructor(
    private readonly posts: IPostAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: UnpublishPostRequest): Promise<UnpublishPostResult> {
    const { correlationId, actor, postId, timestamp } = request;
    // One clock for the whole call: the store stamps the row with the request's time.
    const context = { correlationId, timestamp };

    const current = await loadPost(this.posts, { by: "id", id: postId }, context);
    if (!isPost(current)) {
      return current;
    }
    const refused = await permit(
      this.permissions,
      actor,
      "post.edit",
      subjectOf(current),
      context,
    );
    if (refused !== undefined) {
      return refused;
    }
    if (current.status === "draft") {
      return new PostResponse(correlationId, current);
    }
    if (current.status !== "published" && current.status !== "pending") {
      return new PostNotPublishableResponse(correlationId, current.status);
    }

    const stored = await this.posts.store(
      new StorePostChangesRequest(
        postId,
        { status: "draft", publishedAt: null },
        context,
      ),
    );
    if (stored instanceof PostStoredResponse) {
      return new PostResponse(correlationId, stored.post);
    }
    if (stored instanceof PostNotFoundResponse) {
      return new NoSuchPostResponse(correlationId);
    }
    return unavailable(correlationId, stored, "store");
  }
}
