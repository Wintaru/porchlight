import type { DbClient, TablesUpdate } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { StoreCommentStatusRequest } from "../Requests/StoreCommentStatusRequest";
import { CommentAccessFailedResponse } from "../Responses/CommentAccessFailedResponse";
import { CommentNotFoundResponse } from "../Responses/CommentNotFoundResponse";
import { CommentStoredResponse } from "../Responses/CommentStoredResponse";
import { COMMENT_COLUMNS, toComment } from "../toComment";

export class SupabaseStoreCommentStatusHandler implements IHandler<
  StoreCommentStatusRequest,
  CommentStoredResponse | CommentNotFoundResponse | CommentAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: StoreCommentStatusRequest,
  ): Promise<
    CommentStoredResponse | CommentNotFoundResponse | CommentAccessFailedResponse
  > {
    const { id, status, rejectionReason, correlationId } = request;
    const columns: TablesUpdate<"comments"> = { status };
    if (rejectionReason !== undefined) columns.rejection_reason = rejectionReason;
    const { data, error } = await this.db
      .from("comments")
      .update(columns)
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
