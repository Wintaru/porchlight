import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadCommentsForPostRequest } from "../Requests/LoadCommentsForPostRequest";
import { CommentAccessFailedResponse } from "../Responses/CommentAccessFailedResponse";
import { CommentsLoadedResponse } from "../Responses/CommentsLoadedResponse";
import { COMMENT_COLUMNS, toComment } from "../toComment";

// What everyone may read: visible comments and the tombstones that hold their replies
// in place. PostgREST filter syntax, so a status list is `in.(a,b)`.
const PUBLIC_STATUSES = "status.in.(visible,tombstone)";

export class SupabaseLoadCommentsForPostHandler implements IHandler<
  LoadCommentsForPostRequest,
  CommentsLoadedResponse | CommentAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadCommentsForPostRequest,
  ): Promise<CommentsLoadedResponse | CommentAccessFailedResponse> {
    const { postId, readership, correlationId } = request;
    let query = this.db
      .from("comments")
      .select(COMMENT_COLUMNS)
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
    switch (readership.kind) {
      case "public":
        query = query.or(PUBLIC_STATUSES);
        break;
      case "member":
        query = query.or(`${PUBLIC_STATUSES},author_id.eq.${readership.profileId}`);
        break;
      case "all":
        break;
    }
    const { data, error } = await query;
    if (error) {
      return new CommentAccessFailedResponse(correlationId, error.message);
    }
    return new CommentsLoadedResponse(correlationId, data.map(toComment));
  }
}
