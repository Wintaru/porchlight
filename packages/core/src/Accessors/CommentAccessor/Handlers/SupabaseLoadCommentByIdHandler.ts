import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadCommentByIdRequest } from "../Requests/LoadCommentByIdRequest";
import { CommentAccessFailedResponse } from "../Responses/CommentAccessFailedResponse";
import { CommentLoadedResponse } from "../Responses/CommentLoadedResponse";
import { CommentNotFoundResponse } from "../Responses/CommentNotFoundResponse";
import { COMMENT_COLUMNS, toComment } from "../toComment";

export class SupabaseLoadCommentByIdHandler implements IHandler<
  LoadCommentByIdRequest,
  CommentLoadedResponse | CommentNotFoundResponse | CommentAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadCommentByIdRequest,
  ): Promise<
    CommentLoadedResponse | CommentNotFoundResponse | CommentAccessFailedResponse
  > {
    const { data, error } = await this.db
      .from("comments")
      .select(COMMENT_COLUMNS)
      .eq("id", request.id)
      .maybeSingle();
    if (error) {
      return new CommentAccessFailedResponse(request.correlationId, error.message);
    }
    if (data === null) {
      return new CommentNotFoundResponse(request.correlationId);
    }
    return new CommentLoadedResponse(request.correlationId, toComment(data));
  }
}
