import type { DbClient } from "@porchlight/db";

import type { Comment } from "../../../Common/Comment";
import type { IHandler } from "../../../Common/IHandler";
import { chunked } from "../../../Utilities/collections/chunked";
import type { LoadCommentsByIdsRequest } from "../Requests/LoadCommentsByIdsRequest";
import { CommentAccessFailedResponse } from "../Responses/CommentAccessFailedResponse";
import { CommentsLoadedResponse } from "../Responses/CommentsLoadedResponse";
import { COMMENT_COLUMNS, toComment } from "../toComment";

const IDS_PER_QUERY = 100;

export class SupabaseLoadCommentsByIdsHandler implements IHandler<
  LoadCommentsByIdsRequest,
  CommentsLoadedResponse | CommentAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadCommentsByIdsRequest,
  ): Promise<CommentsLoadedResponse | CommentAccessFailedResponse> {
    const comments: Comment[] = [];
    for (const ids of chunked([...new Set(request.ids)], IDS_PER_QUERY)) {
      const { data, error } = await this.db
        .from("comments")
        .select(COMMENT_COLUMNS)
        .in("id", ids);
      if (error) {
        return new CommentAccessFailedResponse(request.correlationId, error.message);
      }
      comments.push(...data.map(toComment));
    }
    return new CommentsLoadedResponse(request.correlationId, comments);
  }
}
