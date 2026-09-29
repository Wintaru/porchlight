import type { DbClient, TablesUpdate } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { PostChanges } from "../PostChanges";
import { replacePostTags } from "../replacePostTags";
import type { StorePostChangesRequest } from "../Requests/StorePostChangesRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostNotFoundResponse } from "../Responses/PostNotFoundResponse";
import { PostStoredResponse } from "../Responses/PostStoredResponse";
import { PostVersionChangedResponse } from "../Responses/PostVersionChangedResponse";
import { POST_COLUMNS, toPost } from "../toPost";

type Result =
  | PostStoredResponse
  | PostNotFoundResponse
  | PostVersionChangedResponse
  | PostAccessFailedResponse;

// Update and read back in one round trip. A tag change adds the link call and a read
// that shows the stored tags; a tags-only save has no columns and skips the update,
// unless it names a version, which only the update can check.
export class SupabaseStorePostChangesHandler implements IHandler<
  StorePostChangesRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: StorePostChangesRequest): Promise<Result> {
    const { id, changes, correlationId, expectedVersion } = request;
    const columns = toColumns(changes);
    if (expectedVersion !== undefined && Object.keys(columns).length === 0) {
      // Any column makes the update run. The `posts_bump_version` trigger sets the
      // version itself, so the value written here is never kept.
      columns.version = expectedVersion;
    }
    if (Object.keys(columns).length > 0) {
      let update = this.db.from("posts").update(columns).eq("id", id);
      if (expectedVersion !== undefined) {
        update = update.eq("version", expectedVersion);
      }
      const updated = await update.select(POST_COLUMNS).maybeSingle();
      if (updated.error) {
        return new PostAccessFailedResponse(correlationId, updated.error.message);
      }
      if (updated.data === null) {
        return expectedVersion === undefined
          ? new PostNotFoundResponse(correlationId)
          : this.missOf(id, correlationId);
      }
      if (changes.tags === undefined) {
        return new PostStoredResponse(correlationId, toPost(updated.data));
      }
    }
    if (changes.tags !== undefined) {
      const failure = await replacePostTags(this.db, id, changes.tags);
      if (failure !== undefined) {
        return new PostAccessFailedResponse(correlationId, failure);
      }
    }
    const { data, error } = await this.db
      .from("posts")
      .select(POST_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) {
      return new PostAccessFailedResponse(correlationId, error.message);
    }
    if (data === null) {
      return new PostNotFoundResponse(correlationId);
    }
    return new PostStoredResponse(correlationId, toPost(data));
  }

  // A conditional update that matched no row: the post is gone, or its version moved.
  // One more read, only on this rare path, tells the two apart.
  private async missOf(
    id: string,
    correlationId: string,
  ): Promise<
    PostNotFoundResponse | PostVersionChangedResponse | PostAccessFailedResponse
  > {
    const { data, error } = await this.db
      .from("posts")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      return new PostAccessFailedResponse(correlationId, error.message);
    }
    return data === null
      ? new PostNotFoundResponse(correlationId)
      : new PostVersionChangedResponse(correlationId);
  }
}

// Only the fields present in the request reach the row, so an absent field is untouched.
function toColumns(changes: PostChanges): TablesUpdate<"posts"> {
  const columns: TablesUpdate<"posts"> = {};
  if (changes.title !== undefined) columns.title = changes.title;
  if (changes.bodyMd !== undefined) columns.body_md = changes.bodyMd;
  if (changes.bodyHtml !== undefined) columns.body_html = changes.bodyHtml;
  if (changes.summary !== undefined) columns.summary = changes.summary;
  if (changes.coverMediaId !== undefined) columns.cover_media_id = changes.coverMediaId;
  if (changes.coverFrame !== undefined) {
    columns.cover_focus_x = changes.coverFrame.focusX;
    columns.cover_focus_y = changes.coverFrame.focusY;
    columns.cover_zoom = changes.coverFrame.zoom;
  }
  if (changes.visibility !== undefined) columns.visibility = changes.visibility;
  if (changes.commentsEnabled !== undefined)
    columns.comments_enabled = changes.commentsEnabled;
  if (changes.status !== undefined) columns.status = changes.status;
  if (changes.rejectionReason !== undefined) {
    columns.rejection_reason = changes.rejectionReason;
  }
  if (changes.reviewedAt !== undefined) {
    columns.reviewed_at =
      changes.reviewedAt === null ? null : changes.reviewedAt.toISOString();
  }
  if (changes.agentDraftMd !== undefined) columns.agent_draft_md = changes.agentDraftMd;
  if (changes.publishedAt !== undefined) {
    columns.published_at =
      changes.publishedAt === null ? null : changes.publishedAt.toISOString();
  }
  return columns;
}
