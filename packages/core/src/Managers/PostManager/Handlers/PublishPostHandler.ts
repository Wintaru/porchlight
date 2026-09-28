import type { IMediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/IMediaAssetAccessor";
import type { INotificationAccessor } from "../../../Accessors/NotificationAccessor/INotificationAccessor";
import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import type { PostChanges } from "../../../Accessors/PostAccessor/PostChanges";
import { StorePostChangesRequest } from "../../../Accessors/PostAccessor/Requests/StorePostChangesRequest";
import { PostNotFoundResponse } from "../../../Accessors/PostAccessor/Responses/PostNotFoundResponse";
import { PostStoredResponse } from "../../../Accessors/PostAccessor/Responses/PostStoredResponse";
import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import type { IHandler } from "../../../Common/IHandler";
import type { IAgentGuardEngine } from "../../../Engines/AgentGuardEngine/IAgentGuardEngine";
import type { IFollowerNoticeEngine } from "../../../Engines/FollowerNoticeEngine/IFollowerNoticeEngine";
import { NotifyFollowersRequest } from "../../../Engines/FollowerNoticeEngine/Requests/NotifyFollowersRequest";
import type { IEvidenceEngine } from "../../../Engines/EvidenceEngine/IEvidenceEngine";
import { RecordTextEvidenceRequest } from "../../../Engines/EvidenceEngine/Requests/RecordTextEvidenceRequest";
import { evidenceTextOf } from "../evidenceTextOf";
import { recordEvidence } from "../recordEvidence";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { isPost, loadPost, subjectOf } from "../loadPost";
import { notifyStaffOfPendingPost } from "../notifyStaff";
import { admitAgent } from "../admitAgent";
import { coverAwaitsReview } from "../coverAwaitsReview";
import { permit } from "../permit";
import { publishesAtOnce } from "../publishesAtOnce";
import { reviewStamp } from "../provenance";
import type { PublishPostRequest } from "../Requests/PublishPostRequest";
import { NoSuchPostResponse } from "../Responses/NoSuchPostResponse";
import type { PostForbiddenResponse } from "../Responses/PostForbiddenResponse";
import { PostNotPublishableResponse } from "../Responses/PostNotPublishableResponse";
import type { PostRateLimitedResponse } from "../Responses/PostRateLimitedResponse";
import { PostResponse } from "../Responses/PostResponse";
import type { PostUnavailableResponse } from "../Responses/PostUnavailableResponse";
import { unavailable } from "../unavailable";

type PublishPostResult =
  | PostResponse
  | NoSuchPostResponse
  | PostForbiddenResponse
  | PostNotPublishableResponse
  | PostRateLimitedResponse
  | PostUnavailableResponse;

// A draft goes to `published` for a trusted member, an admin or a moderator, and to
// `pending` for a member on probation (D7) — or for anyone whose cover the classifier
// flagged and nobody has approved yet (#36), so a moderator sees it in the queue.
// Publishing a post that is already up, or already waiting, changes nothing. A post a
// moderator took down stays down.
export class PublishPostHandler implements IHandler<
  PublishPostRequest,
  PublishPostResult
> {
  constructor(
    private readonly posts: IPostAccessor,
    private readonly profiles: IProfileAccessor,
    private readonly notifications: INotificationAccessor,
    private readonly permissions: IPermissionEngine,
    private readonly agentGuard: IAgentGuardEngine,
    private readonly mediaAssets: IMediaAssetAccessor,
    private readonly followerNotice: IFollowerNoticeEngine,
    private readonly evidence: IEvidenceEngine,
  ) {}

  async handle(request: PublishPostRequest): Promise<PublishPostResult> {
    const { correlationId, actor, postId, origin, timestamp } = request;
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
    const capped = await admitAgent(this.agentGuard, actor, "agent:publish", context);
    if (capped !== undefined) {
      return capped;
    }
    if (current.status === "pending") {
      return new PostResponse(correlationId, current);
    }
    // A retry after a publish that stopped before the notice (#87): the post is out,
    // and the one-time claim makes asking again safe.
    if (current.status === "published") {
      await this.followerNotice.transform(new NotifyFollowersRequest(current, context));
      return new PostResponse(correlationId, current);
    }
    if (current.status !== "draft") {
      return new PostNotPublishableResponse(correlationId, current.status);
    }

    const heldCover = await coverAwaitsReview(
      this.mediaAssets,
      current.coverMediaId,
      context,
    );
    if (typeof heldCover !== "boolean") {
      return heldCover;
    }
    const review = reviewStamp(actor, timestamp);
    const changes: PostChanges =
      publishesAtOnce(actor) && !heldCover
        ? { status: "published", publishedAt: timestamp, ...review }
        : { status: "pending", publishedAt: null, ...review };
    const stored = await this.posts.store(
      new StorePostChangesRequest(postId, changes, context),
    );
    if (stored instanceof PostNotFoundResponse) {
      return new NoSuchPostResponse(correlationId);
    }
    if (!(stored instanceof PostStoredResponse)) {
      return unavailable(correlationId, stored, "store");
    }
    // The row written when the draft was created hashed its first autosave; this one
    // hashes the text that goes out (#65). Right after the store, before anything that
    // can return early: a retry finds the post out already and writes nothing.
    await recordEvidence(
      this.evidence,
      new RecordTextEvidenceRequest(
        { kind: "post", id: stored.post.id },
        stored.post.author,
        stored.post.agentTokenId,
        origin,
        "not_required",
        evidenceTextOf(stored.post),
        context,
      ),
    );
    if (changes.status === "pending") {
      const notified = await notifyStaffOfPendingPost(
        this.profiles,
        this.notifications,
        postId,
        context,
      );
      if (notified !== undefined) {
        return notified;
      }
    }
    if (changes.status === "published") {
      await this.followerNotice.transform(
        new NotifyFollowersRequest(stored.post, context),
      );
    }
    return new PostResponse(correlationId, stored.post);
  }
}
