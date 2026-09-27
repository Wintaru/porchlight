import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { StoreCommentBodyHtmlRequest } from "../Requests/StoreCommentBodyHtmlRequest";
import { CommentAccessFailedResponse } from "../Responses/CommentAccessFailedResponse";
import { CommentBodyHtmlStoredResponse } from "../Responses/CommentBodyHtmlStoredResponse";

export class SupabaseStoreCommentBodyHtmlHandler implements IHandler<
  StoreCommentBodyHtmlRequest,
  CommentBodyHtmlStoredResponse | CommentAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: StoreCommentBodyHtmlRequest,
  ): Promise<CommentBodyHtmlStoredResponse | CommentAccessFailedResponse> {
    const { error } = await this.db
      .from("comments")
      .update({ body_html: request.bodyHtml })
      .eq("id", request.id);
    if (error) {
      return new CommentAccessFailedResponse(request.correlationId, error.message);
    }
    return new CommentBodyHtmlStoredResponse(request.correlationId);
  }
}
