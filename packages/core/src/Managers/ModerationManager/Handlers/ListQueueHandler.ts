import type { ICommentAccessor } from "../../../Accessors/CommentAccessor/ICommentAccessor";
import { LoadCommentsByStatusRequest } from "../../../Accessors/CommentAccessor/Requests/LoadCommentsByStatusRequest";
import { CommentsLoadedResponse } from "../../../Accessors/CommentAccessor/Responses/CommentsLoadedResponse";
import type { IMediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/IMediaAssetAccessor";
import { LoadMediaAssetByIdRequest } from "../../../Accessors/MediaAssetAccessor/Requests/LoadMediaAssetByIdRequest";
import { MediaAssetLoadedResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetLoadedResponse";
import { MediaAssetNotFoundResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetNotFoundResponse";
import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import { LoadPostsByStatusRequest } from "../../../Accessors/PostAccessor/Requests/LoadPostsByStatusRequest";
import { PostsLoadedResponse } from "../../../Accessors/PostAccessor/Responses/PostsLoadedResponse";
import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import { LoadProfileByIdRequest } from "../../../Accessors/ProfileAccessor/Requests/LoadProfileByIdRequest";
import { ProfileLoadedResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileLoadedResponse";
import { ProfileNotFoundResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileNotFoundResponse";
import type { ContentAuthor } from "../../../Common/ContentAuthor";
import type { IHandler } from "../../../Common/IHandler";
import type { LiveComment } from "../../../Common/LiveComment";
import type { Post } from "../../../Common/Post";
import type { TrustLevel } from "../../../Common/TrustLevel";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { permit } from "../permit";
import type { QueueItem } from "../QueueItem";
import type { ListQueueRequest } from "../Requests/ListQueueRequest";
import type { ModerationForbiddenResponse } from "../Responses/ModerationForbiddenResponse";
import { ModerationUnavailableResponse } from "../Responses/ModerationUnavailableResponse";
import { QueueResponse } from "../Responses/QueueResponse";
import { unavailable } from "../unavailable";

type Result = QueueResponse | ModerationForbiddenResponse | ModerationUnavailableResponse;

// ListQueue (SPEC.md §7): pending posts and comments, newest first. The queue is a
// bounded working set by construction, so resolving each distinct author's trust level
// and each distinct cover image's scan status is a small, deduped fan-out rather than a
// query-per-row over an unbounded table — the "bounded fanned-out N+1 can be the
// correct choice" exception in the standing data-access principle.
export class ListQueueHandler implements IHandler<ListQueueRequest, Result> {
  constructor(
    private readonly posts: IPostAccessor,
    private readonly comments: ICommentAccessor,
    private readonly profiles: IProfileAccessor,
    private readonly mediaAssets: IMediaAssetAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: ListQueueRequest): Promise<Result> {
    const { correlationId, actor, filter, timestamp } = request;
    const context = { correlationId, timestamp };

    const refused = await permit(
      this.permissions,
      actor,
      "moderation.queue.view",
      { kind: "site" },
      context,
    );
    if (refused !== undefined) {
      return refused;
    }

    const [loadedPosts, loadedComments] = await Promise.all([
      this.posts.load(new LoadPostsByStatusRequest("pending", context)),
      this.comments.load(new LoadCommentsByStatusRequest("pending", context)),
    ]);
    if (!(loadedPosts instanceof PostsLoadedResponse)) {
      return unavailable(correlationId, loadedPosts, "posts.load");
    }
    if (!(loadedComments instanceof CommentsLoadedResponse)) {
      return unavailable(correlationId, loadedComments, "comments.load");
    }
    const pendingComments = loadedComments.comments.filter(
      (comment): comment is LiveComment => comment.status !== "tombstone",
    );

    const trustLevels = await this.loadTrustLevels(
      loadedPosts.posts,
      pendingComments,
      context,
    );
    if (trustLevels instanceof ModerationUnavailableResponse) {
      return trustLevels;
    }
    const flaggedCovers = await this.loadFlaggedCovers(loadedPosts.posts, context);
    if (flaggedCovers instanceof ModerationUnavailableResponse) {
      return flaggedCovers;
    }

    const items: QueueItem[] = [
      ...loadedPosts.posts.map((post): QueueItem => ({
        kind: "post",
        post,
        authorTrustLevel: trustLevelOf(post.author, trustLevels),
        flagged: post.coverMediaId !== null && flaggedCovers.has(post.coverMediaId),
      })),
      ...pendingComments.map((comment): QueueItem => ({
        kind: "comment",
        comment,
        authorTrustLevel: trustLevelOf(comment.author, trustLevels),
      })),
    ]
      .filter((item) => matchesFilter(item, filter))
      .sort((a, b) => createdAtOf(b).getTime() - createdAtOf(a).getTime());

    return new QueueResponse(correlationId, items);
  }

  private async loadTrustLevels(
    posts: readonly Post[],
    comments: readonly LiveComment[],
    context: { readonly correlationId: string },
  ): Promise<ReadonlyMap<string, TrustLevel> | ModerationUnavailableResponse> {
    const profileIds = new Set<string>();
    for (const author of [
      ...posts.map((post) => post.author),
      ...comments.map((c) => c.author),
    ]) {
      if (author.kind === "member") {
        profileIds.add(author.profileId);
      }
    }
    const loaded = await Promise.all(
      [...profileIds].map((id) =>
        this.profiles.load(new LoadProfileByIdRequest(id, context)),
      ),
    );
    const trustLevels = new Map<string, TrustLevel>();
    for (const response of loaded) {
      if (response instanceof ProfileLoadedResponse) {
        trustLevels.set(response.profile.id, response.profile.trustLevel);
        continue;
      }
      // A missing profile leaves the item's trust level unresolved (null); a real
      // backend failure must not silently read the same as "not found" — this queue's
      // `probation` filter (and `flagged`, below) exists to catch content that needs a
      // closer look, so a hiccup here must surface as unavailable, not as "clean."
      if (!(response instanceof ProfileNotFoundResponse)) {
        return unavailable(context.correlationId, response, "profiles.load");
      }
    }
    return trustLevels;
  }

  private async loadFlaggedCovers(
    posts: readonly Post[],
    context: { readonly correlationId: string },
  ): Promise<ReadonlySet<string> | ModerationUnavailableResponse> {
    const coverIds = new Set(
      posts.flatMap((post) => (post.coverMediaId === null ? [] : [post.coverMediaId])),
    );
    const loaded = await Promise.all(
      [...coverIds].map((id) =>
        this.mediaAssets.load(new LoadMediaAssetByIdRequest(id, context)),
      ),
    );
    const flagged = new Set<string>();
    for (const response of loaded) {
      if (response instanceof MediaAssetLoadedResponse) {
        if (response.asset.scanStatus === "flagged") {
          flagged.add(response.asset.id);
        }
        continue;
      }
      // Same reasoning as loadTrustLevels: a missing cover is not flagged, but a real
      // backend failure must not silently read as "not flagged."
      if (!(response instanceof MediaAssetNotFoundResponse)) {
        return unavailable(context.correlationId, response, "mediaAssets.load");
      }
    }
    return flagged;
  }
}

function trustLevelOf(
  author: ContentAuthor,
  trustLevels: ReadonlyMap<string, TrustLevel>,
): TrustLevel | null {
  return author.kind === "member" ? (trustLevels.get(author.profileId) ?? null) : null;
}

function createdAtOf(item: QueueItem): Date {
  return item.kind === "post" ? item.post.createdAt : item.comment.createdAt;
}

function matchesFilter(item: QueueItem, filter: ListQueueRequest["filter"]): boolean {
  switch (filter) {
    case "all":
      return true;
    case "anonymous":
      return (
        (item.kind === "post" ? item.post.author : item.comment.author).kind ===
        "anonymous"
      );
    case "probation":
      return item.authorTrustLevel === "probation";
    case "flagged":
      return item.kind === "post" && item.flagged;
  }
}
