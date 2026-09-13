import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadCommentsByStatusRequest } from "../Requests/LoadCommentsByStatusRequest";
import { CommentAccessFailedResponse } from "../Responses/CommentAccessFailedResponse";
import { CommentsLoadedResponse } from "../Responses/CommentsLoadedResponse";
import { COMMENT_COLUMNS, toComment } from "../toComment";

// A real backlog is still a small number of rows (SPEC.md §7's queue is a working set,
// not a feed); this bound exists so a runaway backlog degrades to "the oldest ones are
// missing from this page" rather than an unbounded query.
const MAX_ROWS = 500;

export class SupabaseLoadCommentsByStatusHandler implements IHandler<
  LoadCommentsByStatusRequest,
  CommentsLoadedResponse | CommentAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadCommentsByStatusRequest,
  ): Promise<CommentsLoadedResponse | CommentAccessFailedResponse> {
    const { data, error } = await this.db
      .from("comments")
      .select(COMMENT_COLUMNS)
      .eq("status", request.status)
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS);
    if (error) {
      return new CommentAccessFailedResponse(request.correlationId, error.message);
    }
    return new CommentsLoadedResponse(request.correlationId, data.map(toComment));
  }
}
