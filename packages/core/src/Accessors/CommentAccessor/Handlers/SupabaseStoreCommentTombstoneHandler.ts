import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { StoreCommentTombstoneRequest } from "../Requests/StoreCommentTombstoneRequest";
import { CommentAccessFailedResponse } from "../Responses/CommentAccessFailedResponse";
import { CommentNotFoundResponse } from "../Responses/CommentNotFoundResponse";
import { CommentStoredResponse } from "../Responses/CommentStoredResponse";
import { COMMENT_COLUMNS, toComment } from "../toComment";

// The tombstone shape the schema's CHECKs require: no author column set, both bodies
// empty (D5).
export class SupabaseStoreCommentTombstoneHandler implements IHandler<
  StoreCommentTombstoneRequest,
  CommentStoredResponse | CommentNotFoundResponse | CommentAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: StoreCommentTombstoneRequest,
  ): Promise<
    CommentStoredResponse | CommentNotFoundResponse | CommentAccessFailedResponse
  > {
    const { id, correlationId } = request;
    const { data, error } = await this.db
      .from("comments")
      .update({
        status: "tombstone",
        author_id: null,
        anonymous_author_id: null,
        body_md: "",
        body_html: "",
      })
      .eq("id", id)
      .select(COMMENT_COLUMNS)
      .maybeSingle();
    if (error) {
      return new CommentAccessFailedResponse(correlationId, error.message);
    }
    if (data === null) {
      return new CommentNotFoundResponse(correlationId);
    }
    return new CommentStoredResponse(correlationId, toComment(data));
  }
}
