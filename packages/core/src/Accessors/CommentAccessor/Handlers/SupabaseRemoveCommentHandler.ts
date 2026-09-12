import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import { isParentStillReferenced } from "../PostgresErrorCode";
import type { RemoveCommentRequest } from "../Requests/RemoveCommentRequest";
import { CommentAccessFailedResponse } from "../Responses/CommentAccessFailedResponse";
import { CommentHasRepliesResponse } from "../Responses/CommentHasRepliesResponse";
import { CommentNotFoundResponse } from "../Responses/CommentNotFoundResponse";
import { CommentRemovedResponse } from "../Responses/CommentRemovedResponse";

// The no-cascade parent key is the one that decides whether a comment may go (D5): no
// count first, so a reply that lands in between cannot make the delete fail unmodelled.
export class SupabaseRemoveCommentHandler implements IHandler<
  RemoveCommentRequest,
  | CommentRemovedResponse
  | CommentHasRepliesResponse
  | CommentNotFoundResponse
  | CommentAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: RemoveCommentRequest,
  ): Promise<
    | CommentRemovedResponse
    | CommentHasRepliesResponse
    | CommentNotFoundResponse
    | CommentAccessFailedResponse
  > {
    const { data, error } = await this.db
      .from("comments")
      .delete()
      .eq("id", request.id)
      .select("id")
      .maybeSingle();
    if (error) {
      return isParentStillReferenced(error)
        ? new CommentHasRepliesResponse(request.correlationId)
        : new CommentAccessFailedResponse(request.correlationId, error.message);
    }
    if (data === null) {
      return new CommentNotFoundResponse(request.correlationId);
    }
    return new CommentRemovedResponse(request.correlationId);
  }
}
