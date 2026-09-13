import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadCommentsByAuthorRequest } from "../Requests/LoadCommentsByAuthorRequest";
import { CommentAccessFailedResponse } from "../Responses/CommentAccessFailedResponse";
import { CommentsLoadedResponse } from "../Responses/CommentsLoadedResponse";
import { COMMENT_COLUMNS, toComment } from "../toComment";

type Result = CommentsLoadedResponse | CommentAccessFailedResponse;

// One member's comments is a bounded list, the same assumption LoadPostsByAuthorRequest
// makes: no page here yet.
export class SupabaseLoadCommentsByAuthorHandler implements IHandler<
  LoadCommentsByAuthorRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: LoadCommentsByAuthorRequest): Promise<Result> {
    const { data, error } = await this.db
      .from("comments")
      .select(COMMENT_COLUMNS)
      .eq("author_id", request.profileId)
      .order("created_at", { ascending: false });
    if (error) {
      return new CommentAccessFailedResponse(request.correlationId, error.message);
    }
    return new CommentsLoadedResponse(request.correlationId, data.map(toComment));
  }
}
