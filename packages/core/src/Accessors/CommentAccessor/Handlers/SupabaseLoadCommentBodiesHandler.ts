import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadCommentBodiesRequest } from "../Requests/LoadCommentBodiesRequest";
import { CommentAccessFailedResponse } from "../Responses/CommentAccessFailedResponse";
import { CommentBodiesLoadedResponse } from "../Responses/CommentBodiesLoadedResponse";

export class SupabaseLoadCommentBodiesHandler implements IHandler<
  LoadCommentBodiesRequest,
  CommentBodiesLoadedResponse | CommentAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadCommentBodiesRequest,
  ): Promise<CommentBodiesLoadedResponse | CommentAccessFailedResponse> {
    const { afterId, limit, correlationId } = request;
    const query = this.db
      .from("comments")
      .select("id, body_md, body_html")
      // A tombstone has no words to render.
      .neq("status", "tombstone");
    const { data, error } = await (afterId === null ? query : query.gt("id", afterId))
      .order("id", { ascending: true })
      .limit(limit);
    if (error) {
      return new CommentAccessFailedResponse(correlationId, error.message);
    }
    return new CommentBodiesLoadedResponse(
      correlationId,
      data.map((row) => ({ id: row.id, bodyMd: row.body_md, bodyHtml: row.body_html })),
    );
  }
}
