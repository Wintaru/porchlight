import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { StoreCommentChangesRequest } from "../Requests/StoreCommentChangesRequest";
import { CommentAccessFailedResponse } from "../Responses/CommentAccessFailedResponse";
import { CommentNotFoundResponse } from "../Responses/CommentNotFoundResponse";
import { CommentStoredResponse } from "../Responses/CommentStoredResponse";
import { COMMENT_COLUMNS, toComment } from "../toComment";

export class SupabaseStoreCommentChangesHandler implements IHandler<
  StoreCommentChangesRequest,
  CommentStoredResponse | CommentNotFoundResponse | CommentAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: StoreCommentChangesRequest,
  ): Promise<
    CommentStoredResponse | CommentNotFoundResponse | CommentAccessFailedResponse
  > {
    const { id, changes, correlationId } = request;
    const { data, error } = await this.db
      .from("comments")
      .update({ body_md: changes.bodyMd, body_html: changes.bodyHtml })
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
