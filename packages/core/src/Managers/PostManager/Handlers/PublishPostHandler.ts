import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import type { PostChanges } from "../../../Accessors/PostAccessor/PostChanges";
import { StorePostChangesRequest } from "../../../Accessors/PostAccessor/Requests/StorePostChangesRequest";
import { PostNotFoundResponse } from "../../../Accessors/PostAccessor/Responses/PostNotFoundResponse";
import { PostStoredResponse } from "../../../Accessors/PostAccessor/Responses/PostStoredResponse";
import type { Actor } from "../../../Common/Actor";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { isPost, loadPost, subjectOf } from "../loadPost";
import { permit } from "../permit";
import type { PublishPostRequest } from "../Requests/PublishPostRequest";
import { NoSuchPostResponse } from "../Responses/NoSuchPostResponse";
import type { PostForbiddenResponse } from "../Responses/PostForbiddenResponse";
import { PostNotPublishableResponse } from "../Responses/PostNotPublishableResponse";
import { PostResponse } from "../Responses/PostResponse";
import type { PostUnavailableResponse } from "../Responses/PostUnavailableResponse";
import { unavailable } from "../unavailable";

type PublishPostResult =
  | PostResponse
  | NoSuchPostResponse
  | PostForbiddenResponse
  | PostNotPublishableResponse
  | PostUnavailableResponse;

// A draft goes to `published` for a trusted member, an admin or a moderator, and to
// `pending` for a member on probation (D7). Publishing a post that is already up, or
// already waiting, changes nothing. A post a moderator took down stays down.
export class PublishPostHandler implements IHandler<
  PublishPostRequest,
  PublishPostResult
> {
  constructor(
    private readonly posts: IPostAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: PublishPostRequest): Promise<PublishPostResult> {
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
      "post.publish",
      subjectOf(current),
      context,
    );
    if (refused !== undefined) {
      return refused;
    }
    if (current.status === "published" || current.status === "pending") {
      return new PostResponse(correlationId, current);
    }
    if (current.status !== "draft") {
      return new PostNotPublishableResponse(correlationId, current.status);
    }

    const changes: PostChanges = publishesAtOnce(actor)
      ? { status: "published", publishedAt: timestamp }
      : { status: "pending", publishedAt: null };
    const stored = await this.posts.store(
      new StorePostChangesRequest(postId, changes, context),
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

// Trust decides (SPEC.md §4). Staff are trusted by definition.
function publishesAtOnce(actor: Actor): boolean {
  return (
    actor.kind === "member" &&
    (actor.profile.trustLevel === "trusted" || actor.profile.role !== "member")
  );
}
