import type { DbClient, TablesUpdate } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { PostChanges } from "../PostChanges";
import { replacePostTags } from "../replacePostTags";
import type { StorePostChangesRequest } from "../Requests/StorePostChangesRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostNotFoundResponse } from "../Responses/PostNotFoundResponse";
import { PostStoredResponse } from "../Responses/PostStoredResponse";
import { POST_COLUMNS, toPost } from "../toPost";

// Update and read back in one round trip. A tag change adds the link call and a read
// that shows the stored tags; a tags-only save has no columns and skips the update.
export class SupabaseStorePostChangesHandler implements IHandler<
  StorePostChangesRequest,
  PostStoredResponse | PostNotFoundResponse | PostAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: StorePostChangesRequest,
  ): Promise<PostStoredResponse | PostNotFoundResponse | PostAccessFailedResponse> {
    const { id, changes, correlationId } = request;
    const columns = toColumns(changes);
    if (Object.keys(columns).length > 0) {
      const updated = await this.db
        .from("posts")
        .update(columns)
        .eq("id", id)
        .select(POST_COLUMNS)
        .maybeSingle();
      if (updated.error) {
        return new PostAccessFailedResponse(correlationId, updated.error.message);
      }
      if (updated.data === null) {
        return new PostNotFoundResponse(correlationId);
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
}

// Only the fields present in the request reach the row, so an absent field is untouched.
function toColumns(changes: PostChanges): TablesUpdate<"posts"> {
  const columns: TablesUpdate<"posts"> = {};
  if (changes.title !== undefined) columns.title = changes.title;
  if (changes.bodyMd !== undefined) columns.body_md = changes.bodyMd;
  if (changes.bodyHtml !== undefined) columns.body_html = changes.bodyHtml;
  if (changes.summary !== undefined) columns.summary = changes.summary;
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
  if (changes.publishedAt !== undefined) {
    columns.published_at =
      changes.publishedAt === null ? null : changes.publishedAt.toISOString();
  }
  return columns;
}
