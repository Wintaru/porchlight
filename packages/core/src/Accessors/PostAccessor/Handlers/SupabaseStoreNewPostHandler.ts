import type { DbClient, TablesInsert } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { NewPost } from "../NewPost";
import { isSlugTaken } from "../PostgresErrorCode";
import { replacePostTags } from "../replacePostTags";
import type { StoreNewPostRequest } from "../Requests/StoreNewPostRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostSlugTakenResponse } from "../Responses/PostSlugTakenResponse";
import { PostStoredResponse } from "../Responses/PostStoredResponse";
import { POST_COLUMNS, toPost } from "../toPost";

// Insert the row and read it back in one round trip. Only a post with tags needs the
// second and third: the link call, then a read that shows the stored tags (an
// existing tag keeps its name). The row exists once the insert returns, so a failure
// after it answers PostAccessFailed for a post that is already in the member's list.
export class SupabaseStoreNewPostHandler implements IHandler<
  StoreNewPostRequest,
  PostStoredResponse | PostSlugTakenResponse | PostAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: StoreNewPostRequest,
  ): Promise<PostStoredResponse | PostSlugTakenResponse | PostAccessFailedResponse> {
    const { post, correlationId } = request;
    const inserted = await this.db
      .from("posts")
      .insert(toInsert(post))
      .select(POST_COLUMNS)
      .single();
    if (inserted.error) {
      return isSlugTaken(inserted.error)
        ? new PostSlugTakenResponse(correlationId, post.slug)
        : new PostAccessFailedResponse(correlationId, inserted.error.message);
    }
    if (post.tags.length === 0) {
      return new PostStoredResponse(correlationId, toPost(inserted.data));
    }
    const failure = await replacePostTags(this.db, inserted.data.id, post.tags);
    if (failure !== undefined) {
      return new PostAccessFailedResponse(correlationId, failure);
    }
    const { data, error } = await this.db
      .from("posts")
      .select(POST_COLUMNS)
      .eq("id", inserted.data.id)
      .single();
    if (error) {
      return new PostAccessFailedResponse(correlationId, error.message);
    }
    return new PostStoredResponse(correlationId, toPost(data));
  }
}

function toInsert(post: NewPost): TablesInsert<"posts"> {
  return {
    author_id: post.author.kind === "member" ? post.author.profileId : null,
    anonymous_author_id:
      post.author.kind === "anonymous" ? post.author.anonymousAuthorId : null,
    slug: post.slug,
    title: post.title,
    body_md: post.bodyMd,
    body_html: post.bodyHtml,
    summary: post.summary,
    visibility: post.visibility,
    comments_enabled: post.commentsEnabled,
    cover_media_id: post.coverMediaId,
    origin: post.origin,
    agent_token_id: post.agentTokenId,
    reviewed_at: post.reviewedAt === null ? null : post.reviewedAt.toISOString(),
    agent_draft_md: post.agentDraftMd,
  };
}
