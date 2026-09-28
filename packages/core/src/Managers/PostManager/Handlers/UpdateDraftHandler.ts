import type { IMediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/IMediaAssetAccessor";
import type { INotificationAccessor } from "../../../Accessors/NotificationAccessor/INotificationAccessor";
import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import type { PostChanges } from "../../../Accessors/PostAccessor/PostChanges";
import { StorePostChangesRequest } from "../../../Accessors/PostAccessor/Requests/StorePostChangesRequest";
import { PostNotFoundResponse } from "../../../Accessors/PostAccessor/Responses/PostNotFoundResponse";
import { PostStoredResponse } from "../../../Accessors/PostAccessor/Responses/PostStoredResponse";
import { PostVersionChangedResponse } from "../../../Accessors/PostAccessor/Responses/PostVersionChangedResponse";
import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import type { IReportAccessor } from "../../../Accessors/ReportAccessor/IReportAccessor";
import { CountOpenReportsOnPostRequest } from "../../../Accessors/ReportAccessor/Requests/CountOpenReportsOnPostRequest";
import { OpenReportsCountedResponse } from "../../../Accessors/ReportAccessor/Responses/OpenReportsCountedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { Post } from "../../../Common/Post";
import { ResponseBase } from "../../../Common/ResponseBase";
import type { IContentRenderEngine } from "../../../Engines/ContentRenderEngine/IContentRenderEngine";
import type { IEvidenceEngine } from "../../../Engines/EvidenceEngine/IEvidenceEngine";
import { RecordTextEvidenceRequest } from "../../../Engines/EvidenceEngine/Requests/RecordTextEvidenceRequest";
import type { IFollowerNoticeEngine } from "../../../Engines/FollowerNoticeEngine/IFollowerNoticeEngine";
import { NotifyFollowersRequest } from "../../../Engines/FollowerNoticeEngine/Requests/NotifyFollowersRequest";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { evidenceTextOf } from "../evidenceTextOf";
import { isPost, loadPost, subjectOf } from "../loadPost";
import { checkCover } from "../checkCover";
import { coverAwaitsReview } from "../coverAwaitsReview";
import { notifyStaffOfPendingPost } from "../notifyStaff";
import { permit } from "../permit";
import { agentDraftStamp, reviewStamp } from "../provenance";
import { publishesAtOnce } from "../publishesAtOnce";
import { recordEvidence } from "../recordEvidence";
import type { UpdateDraftRequest } from "../Requests/UpdateDraftRequest";
import { NoSuchPostResponse } from "../Responses/NoSuchPostResponse";
import { PostChangedResponse } from "../Responses/PostChangedResponse";
import type { PostForbiddenResponse } from "../Responses/PostForbiddenResponse";
import { PostRejectedResponse } from "../Responses/PostRejectedResponse";
import { PostResponse } from "../Responses/PostResponse";
import type { PostUnavailableResponse } from "../Responses/PostUnavailableResponse";
import { checkBodyLength, renderBody, shapeTags } from "../shapeDraft";
import { unavailable } from "../unavailable";
import { visibilityMoveOf } from "../visibilityMove";

type UpdateDraftResult =
  | PostResponse
  | NoSuchPostResponse
  | PostChangedResponse
  | PostForbiddenResponse
  | PostRejectedResponse
  | PostUnavailableResponse;

// Load, permission, then reshape only what changed: a new body is re-rendered, new tag
// names are re-slugged, a blank title is refused. The slug never moves (D11). A new
// visibility can move the status (D27, `visibilityMove`): a published private post that
// turns public or unlisted goes out now, through the publish path, and a post waiting
// in the queue that turns private leaves it. A published post that turns public from
// anything else tells its followers, once (#87).
export class UpdateDraftHandler implements IHandler<
  UpdateDraftRequest,
  UpdateDraftResult
> {
  constructor(
    private readonly posts: IPostAccessor,
    private readonly content: IContentRenderEngine,
    private readonly permissions: IPermissionEngine,
    private readonly mediaAssets: IMediaAssetAccessor,
    private readonly profiles: IProfileAccessor,
    private readonly notifications: INotificationAccessor,
    private readonly followerNotice: IFollowerNoticeEngine,
    private readonly evidence: IEvidenceEngine,
    private readonly reports: IReportAccessor,
  ) {}

  async handle(request: UpdateDraftRequest): Promise<UpdateDraftResult> {
    const { correlationId, actor, postId, changes, timestamp, expectedVersion, origin } =
      request;
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
    // Whoever may edit the post as it is must also be allowed it as it will be: only
    // the author may make a post private (D27), since nobody else could read it after.
    if (changes.visibility !== undefined && changes.visibility !== current.visibility) {
      const refusedNext = await permit(
        this.permissions,
        actor,
        "post.edit",
        subjectOf({ ...current, visibility: changes.visibility }),
        context,
      );
      if (refusedNext !== undefined) {
        return refusedNext;
      }
    }
    const move = visibilityMoveOf(current, changes.visibility);
    if (move === "leaves-private") {
      // Going out from private is a publish (D27): the posting policy applies as at
      // Publish, and the evidence row needs the request's origin, which only a button
      // press sends. An autosave may not publish.
      const refusedPublish = await permit(
        this.permissions,
        actor,
        "post.publish",
        subjectOf({ ...current, visibility: changes.visibility ?? current.visibility }),
        context,
      );
      if (refusedPublish !== undefined) {
        return refusedPublish;
      }
      if (origin === undefined) {
        return new PostRejectedResponse(correlationId, "visibility");
      }
    }
    if (changes.visibility === "private" && current.visibility !== "private") {
      // A report no moderator has decided keeps the post where they can see it:
      // private must never take an item out of moderation (D27).
      const reported = await this.reports.load(
        new CountOpenReportsOnPostRequest(postId, context),
      );
      if (!(reported instanceof OpenReportsCountedResponse)) {
        return unavailable(correlationId, reported, "reports.load");
      }
      if (reported.count > 0) {
        return new PostRejectedResponse(correlationId, "reported");
      }
    }
    // Already stale on read: answer before rendering. The store checks again, since a
    // write can still land between this read and the update (#100).
    if (expectedVersion !== undefined && current.version !== expectedVersion) {
      return new PostChangedResponse(correlationId);
    }

    // A person's save is a review (D22); an agent's is not.
    const columns: PostChanges = {
      ...reviewStamp(actor, timestamp),
      ...agentDraftStamp(actor, current, changes.bodyMd),
    };
    const shaped: { -readonly [K in keyof PostChanges]: PostChanges[K] } = columns;
    if (changes.title !== undefined) {
      const title = changes.title.trim();
      if (title === "") {
        return new PostRejectedResponse(correlationId, "title");
      }
      shaped.title = title;
    }
    if (changes.bodyMd !== undefined) {
      const tooLong = checkBodyLength(changes.bodyMd, context);
      if (tooLong !== undefined) {
        return tooLong;
      }
      const bodyHtml = await renderBody(this.content, changes.bodyMd, context);
      if (typeof bodyHtml !== "string") {
        return bodyHtml;
      }
      shaped.bodyMd = changes.bodyMd;
      shaped.bodyHtml = bodyHtml;
    }
    if (changes.tags !== undefined) {
      const tags = await shapeTags(this.content, changes.tags, context);
      if (tags instanceof ResponseBase) {
        return tags;
      }
      shaped.tags = tags;
    }
    if (changes.summary !== undefined) shaped.summary = changes.summary;
    if (
      changes.coverMediaId !== undefined &&
      changes.coverMediaId !== current.coverMediaId
    ) {
      // Only a new cover is checked: a cover already on the post stays usable even if
      // the author's upload list has since changed around it.
      const authorId = current.author.kind === "member" ? current.author.profileId : "";
      const badCover = await checkCover(
        this.mediaAssets,
        authorId,
        changes.coverMediaId,
        context,
      );
      if (badCover !== undefined) {
        return badCover;
      }
      // A post already out (or in the queue) cannot take a cover a moderator has not
      // seen: nothing would send it to them, and the cover would never show. A draft
      // may, since publishing it sends the post to the queue (coverAwaitsReview).
      if (current.status !== "draft") {
        const held = await coverAwaitsReview(
          this.mediaAssets,
          changes.coverMediaId,
          context,
        );
        if (held === true) {
          return new PostRejectedResponse(correlationId, "cover");
        }
        if (held !== false) {
          return held;
        }
      }
      shaped.coverMediaId = changes.coverMediaId;
    }
    if (changes.visibility !== undefined) shaped.visibility = changes.visibility;
    if (changes.commentsEnabled !== undefined)
      shaped.commentsEnabled = changes.commentsEnabled;

    if (move === "leaves-private") {
      // The publish path, now (PublishPostHandler): the cover this save leaves on the
      // post decides with the author's trust whether it goes up or waits.
      const heldCover = await coverAwaitsReview(
        this.mediaAssets,
        shaped.coverMediaId === undefined ? current.coverMediaId : shaped.coverMediaId,
        context,
      );
      if (typeof heldCover !== "boolean") {
        return heldCover;
      }
      if (publishesAtOnce(actor) && !heldCover) {
        shaped.publishedAt = timestamp;
      } else {
        shaped.status = "pending";
        shaped.publishedAt = null;
      }
    }
    if (move === "enters-private") {
      shaped.status = "published";
      shaped.publishedAt = timestamp;
    }

    // A save that writes the visibility applies only to the row as read here: two saves
    // racing (one making a queued post private, one keeping it public) must not end
    // with a public post that skipped the queue (D27). The loser answers "changed".
    const pinnedVersion =
      expectedVersion ?? (changes.visibility === undefined ? undefined : current.version);
    const stored = await this.posts.store(
      new StorePostChangesRequest(postId, columns, context, pinnedVersion),
    );
    if (stored instanceof PostStoredResponse) {
      const failed = await this.afterStore(current, stored.post, move, request);
      return failed ?? new PostResponse(correlationId, stored.post);
    }
    if (stored instanceof PostVersionChangedResponse) {
      return new PostChangedResponse(correlationId);
    }
    if (stored instanceof PostNotFoundResponse) {
      return new NoSuchPostResponse(correlationId);
    }
    return unavailable(correlationId, stored, "store");
  }

  // What a publish does after its store, for a save that published (#101, D27). The
  // evidence row hashes the text that goes out now (#65); a post that went to the queue
  // tells the staff; a post that is up and public tells its followers, once (#87).
  private async afterStore(
    before: Post,
    after: Post,
    move: ReturnType<typeof visibilityMoveOf>,
    request: UpdateDraftRequest,
  ): Promise<PostUnavailableResponse | undefined> {
    const { correlationId, timestamp } = request;
    const context = { correlationId, timestamp };
    // `handle` refused a move out of private with no origin, so it is here.
    if (move === "leaves-private" && request.origin !== undefined) {
      await recordEvidence(
        this.evidence,
        new RecordTextEvidenceRequest(
          { kind: "post", id: after.id },
          after.author,
          after.agentTokenId,
          request.origin,
          "not_required",
          evidenceTextOf(after),
          context,
        ),
      );
      if (after.status === "pending") {
        return notifyStaffOfPendingPost(
          this.profiles,
          this.notifications,
          after.id,
          context,
        );
      }
    }
    if (
      before.visibility !== "public" &&
      after.visibility === "public" &&
      after.status === "published"
    ) {
      await this.followerNotice.transform(new NotifyFollowersRequest(after, context));
    }
    return undefined;
  }
}
