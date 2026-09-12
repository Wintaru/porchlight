import type { DbClient, TablesInsert } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { NewComment } from "../NewComment";
import type { StoreNewCommentRequest } from "../Requests/StoreNewCommentRequest";
import { CommentAccessFailedResponse } from "../Responses/CommentAccessFailedResponse";
import { CommentStoredResponse } from "../Responses/CommentStoredResponse";
import { COMMENT_COLUMNS, toComment } from "../toComment";

// Insert the row and read it back in one round trip. `depth` is left to the
// `comments_set_depth` trigger, so the store, not the caller, is the source of it.
export class SupabaseStoreNewCommentHandler implements IHandler<
  StoreNewCommentRequest,
  CommentStoredResponse | CommentAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: StoreNewCommentRequest,
  ): Promise<CommentStoredResponse | CommentAccessFailedResponse> {
    const { data, error } = await this.db
      .from("comments")
      .insert(toInsert(request.comment))
      .select(COMMENT_COLUMNS)
      .single();
    if (error) {
      return new CommentAccessFailedResponse(request.correlationId, error.message);
    }
    return new CommentStoredResponse(request.correlationId, toComment(data));
  }
}

function toInsert(comment: NewComment): TablesInsert<"comments"> {
  return {
    post_id: comment.postId,
    parent_id: comment.parentId,
    author_id: comment.author.kind === "member" ? comment.author.profileId : null,
    anonymous_author_id:
      comment.author.kind === "anonymous" ? comment.author.anonymousAuthorId : null,
    body_md: comment.bodyMd,
    body_html: comment.bodyHtml,
    status: comment.status,
  };
}
