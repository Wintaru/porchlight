import type { IAgentTokenAccessor } from "../../../Accessors/AgentTokenAccessor/IAgentTokenAccessor";
import { ListAgentTokensByOwnerRequest } from "../../../Accessors/AgentTokenAccessor/Requests/ListAgentTokensByOwnerRequest";
import { AgentTokensLoadedResponse } from "../../../Accessors/AgentTokenAccessor/Responses/AgentTokensLoadedResponse";
import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import { LoadVoiceGuideRequest } from "../../../Accessors/ProfileAccessor/Requests/LoadVoiceGuideRequest";
import { VoiceGuideLoadedResponse } from "../../../Accessors/ProfileAccessor/Responses/VoiceGuideLoadedResponse";
import type { AgentToken } from "../../../Common/AgentToken";
import type { ICommentAccessor } from "../../../Accessors/CommentAccessor/ICommentAccessor";
import { LoadCommentsByAuthorRequest } from "../../../Accessors/CommentAccessor/Requests/LoadCommentsByAuthorRequest";
import { CommentsLoadedResponse } from "../../../Accessors/CommentAccessor/Responses/CommentsLoadedResponse";
import type { IMediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/IMediaAssetAccessor";
import { LoadMediaAssetsByOwnerRequest } from "../../../Accessors/MediaAssetAccessor/Requests/LoadMediaAssetsByOwnerRequest";
import { MediaAssetsLoadedResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetsLoadedResponse";
import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import { LoadPostsByAuthorRequest } from "../../../Accessors/PostAccessor/Requests/LoadPostsByAuthorRequest";
import { PostsLoadedResponse } from "../../../Accessors/PostAccessor/Responses/PostsLoadedResponse";
import type { Reaction } from "../../../Accessors/ReactionAccessor/Reaction";
import type { IReactionAccessor } from "../../../Accessors/ReactionAccessor/IReactionAccessor";
import { LoadReactionsByProfileRequest } from "../../../Accessors/ReactionAccessor/Requests/LoadReactionsByProfileRequest";
import { ReactionsLoadedResponse } from "../../../Accessors/ReactionAccessor/Responses/ReactionsLoadedResponse";
import type { Comment } from "../../../Common/Comment";
import type { IHandler } from "../../../Common/IHandler";
import type { LiveComment } from "../../../Common/LiveComment";
import type { MediaAsset } from "../../../Common/MediaAsset";
import type { Post } from "../../../Common/Post";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { createZipArchive } from "../../../Utilities/export/createZipArchive";
import { permit } from "../permit";
import type { ExportAccountRequest } from "../Requests/ExportAccountRequest";
import type { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import type { ActionForbiddenResponse } from "../Responses/ActionForbiddenResponse";
import { ExportBundleResponse } from "../Responses/ExportBundleResponse";
import { unavailable } from "../unavailable";

type Result = ExportBundleResponse | ActionForbiddenResponse | AccountUnavailableResponse;

// Everything a member made, as markdown per post and comment plus one JSON bundle
// (SPEC.md §10). One click, no waiting period: every load below runs against rows the
// member already owns, so there is nothing to queue.
export class ExportAccountHandler implements IHandler<ExportAccountRequest, Result> {
  constructor(
    private readonly posts: IPostAccessor,
    private readonly comments: ICommentAccessor,
    private readonly reactions: IReactionAccessor,
    private readonly mediaAssets: IMediaAssetAccessor,
    private readonly profiles: IProfileAccessor,
    private readonly agentTokens: IAgentTokenAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: ExportAccountRequest): Promise<Result> {
    const { correlationId, actor, profileId } = request;
    const context = { correlationId };

    const refused = await permit(
      this.permissions,
      actor,
      "account.export",
      { kind: "profile", id: profileId },
      context,
    );
    if (refused !== undefined) {
      return refused;
    }

    const loadedPosts = await this.posts.load(
      new LoadPostsByAuthorRequest(profileId, context),
    );
    if (!(loadedPosts instanceof PostsLoadedResponse)) {
      return unavailable(correlationId, loadedPosts, "posts.load");
    }
    const loadedComments = await this.comments.load(
      new LoadCommentsByAuthorRequest(profileId, context),
    );
    if (!(loadedComments instanceof CommentsLoadedResponse)) {
      return unavailable(correlationId, loadedComments, "comments.load");
    }
    const loadedReactions = await this.reactions.load(
      new LoadReactionsByProfileRequest(profileId, context),
    );
    if (!(loadedReactions instanceof ReactionsLoadedResponse)) {
      return unavailable(correlationId, loadedReactions, "reactions.load");
    }
    const loadedMedia = await this.mediaAssets.load(
      new LoadMediaAssetsByOwnerRequest(profileId, context),
    );
    if (!(loadedMedia instanceof MediaAssetsLoadedResponse)) {
      return unavailable(correlationId, loadedMedia, "mediaAssets.load");
    }

    const loadedGuide = await this.profiles.load(
      new LoadVoiceGuideRequest(profileId, context),
    );
    if (!(loadedGuide instanceof VoiceGuideLoadedResponse)) {
      return unavailable(correlationId, loadedGuide, "profiles.load");
    }
    const loadedTokens = await this.agentTokens.load(
      new ListAgentTokensByOwnerRequest(profileId, context),
    );
    if (!(loadedTokens instanceof AgentTokensLoadedResponse)) {
      return unavailable(correlationId, loadedTokens, "agentTokens.load");
    }

    // A tombstone has no words left to export, and cannot be one of this member's own
    // rows anyway: erasure is the only thing that creates one, and this handler always
    // runs before that.
    const liveComments = loadedComments.comments.filter(isLive);

    const files = new Map<string, string>();
    for (const post of loadedPosts.posts) {
      files.set(`posts/${post.slug}.md`, postMarkdown(post));
    }
    for (const comment of liveComments) {
      files.set(`comments/${comment.id}.md`, commentMarkdown(comment));
    }
    if (loadedGuide.guideMd !== null) {
      files.set("voice-guide.md", loadedGuide.guideMd);
    }
    files.set(
      "data.json",
      JSON.stringify(
        {
          posts: loadedPosts.posts.map(postJson),
          comments: liveComments.map(commentJson),
          reactions: loadedReactions.reactions.map(reactionJson),
          uploads: loadedMedia.assets.map(mediaJson),
          voiceGuide: loadedGuide.guideMd,
          agentTokens: loadedTokens.tokens.map(tokenJson),
        },
        null,
        2,
      ),
    );

    const bytes = await createZipArchive(files);
    return new ExportBundleResponse(
      correlationId,
      `porchlight-export-${profileId}.zip`,
      bytes,
    );
  }
}

function isLive(comment: Comment): comment is LiveComment {
  return comment.status !== "tombstone";
}

function postMarkdown(post: Post): string {
  const front = [
    `title: ${post.title}`,
    `slug: ${post.slug}`,
    `status: ${post.status}`,
    `visibility: ${post.visibility}`,
    `tags: ${post.tags.map((tag) => tag.slug).join(", ")}`,
    `published_at: ${post.publishedAt?.toISOString() ?? ""}`,
    `created_at: ${post.createdAt.toISOString()}`,
  ].join("\n");
  return `---\n${front}\n---\n\n${post.bodyMd}\n`;
}

function commentMarkdown(comment: LiveComment): string {
  const front = [
    `post_id: ${comment.postId}`,
    `status: ${comment.status}`,
    `created_at: ${comment.createdAt.toISOString()}`,
  ].join("\n");
  return `---\n${front}\n---\n\n${comment.bodyMd}\n`;
}

function postJson(post: Post) {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    status: post.status,
    visibility: post.visibility,
    tags: post.tags.map((tag) => tag.slug),
    origin: post.origin,
    // The agent's first text is the member's data too (D22).
    agentDraftMd: post.agentDraftMd,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    createdAt: post.createdAt.toISOString(),
  };
}

function commentJson(comment: LiveComment) {
  return {
    id: comment.id,
    postId: comment.postId,
    parentId: comment.parentId,
    status: comment.status,
    createdAt: comment.createdAt.toISOString(),
  };
}

function reactionJson(reaction: Reaction) {
  return { target: reaction.target, kind: reaction.kind };
}

// A token's name and scopes, never its hash (SPEC.md §17): the export is the member's
// record of what they granted, not a credential.
function tokenJson(token: AgentToken) {
  return {
    name: token.name,
    scopes: token.scopes,
    createdAt: token.createdAt.toISOString(),
    expiresAt: token.expiresAt?.toISOString() ?? null,
    revokedAt: token.revokedAt?.toISOString() ?? null,
    lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
  };
}

function mediaJson(asset: MediaAsset) {
  return {
    id: asset.id,
    originalFilename: asset.originalFilename,
    mimeType: asset.mimeType,
    bytes: asset.bytes,
    scanStatus: asset.scanStatus,
    createdAt: asset.createdAt.toISOString(),
  };
}
