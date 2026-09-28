import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { StoreCommentBodyHtmlRequest } from "../Requests/StoreCommentBodyHtmlRequest";
import { CommentAccessFailedResponse } from "../Responses/CommentAccessFailedResponse";
import { CommentBodyChangedSinceReadResponse } from "../Responses/CommentBodyChangedSinceReadResponse";
import { CommentBodyHtmlStoredResponse } from "../Responses/CommentBodyHtmlStoredResponse";

export class SupabaseStoreCommentBodyHtmlHandler implements IHandler<
  StoreCommentBodyHtmlRequest,
  | CommentBodyHtmlStoredResponse
  | CommentBodyChangedSinceReadResponse
  | CommentAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: StoreCommentBodyHtmlRequest,
  ): Promise<
    | CommentBodyHtmlStoredResponse
    | CommentBodyChangedSinceReadResponse
    | CommentAccessFailedResponse
  > {
    const { data, error } = await this.db
      .from("comments")
      .update({ body_html: request.bodyHtml })
      .eq("id", request.id)
      .eq("body_md", request.renderedFrom)
      // Only the id, to learn whether a row matched.
      .select("id");
    if (error) {
      return new CommentAccessFailedResponse(request.correlationId, error.message);
    }
    if (data.length === 0) {
      return new CommentBodyChangedSinceReadResponse(request.correlationId);
    }
    return new CommentBodyHtmlStoredResponse(request.correlationId);
  }
}
