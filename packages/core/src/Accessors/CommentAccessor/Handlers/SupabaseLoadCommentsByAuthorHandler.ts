import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import { readAllPages } from "../../../Utilities/collections/readAllPages";
import type { LoadCommentsByAuthorRequest } from "../Requests/LoadCommentsByAuthorRequest";
import { CommentAccessFailedResponse } from "../Responses/CommentAccessFailedResponse";
import { CommentsLoadedResponse } from "../Responses/CommentsLoadedResponse";
import { COMMENT_COLUMNS, toComment } from "../toComment";

type Result = CommentsLoadedResponse | CommentAccessFailedResponse;

// Every one of a member's comments, past PostgREST's row cap: an export lists them all.
export class SupabaseLoadCommentsByAuthorHandler implements IHandler<
  LoadCommentsByAuthorRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: LoadCommentsByAuthorRequest): Promise<Result> {
    const read = await readAllPages((from, to) =>
      this.db
        .from("comments")
        .select(COMMENT_COLUMNS)
        .eq("author_id", request.profileId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    );
    if ("error" in read) {
      return new CommentAccessFailedResponse(request.correlationId, read.error);
    }
    return new CommentsLoadedResponse(request.correlationId, read.rows.map(toComment));
  }
}
