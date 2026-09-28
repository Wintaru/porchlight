import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { StorePostBodyHtmlRequest } from "../Requests/StorePostBodyHtmlRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostBodyChangedSinceReadResponse } from "../Responses/PostBodyChangedSinceReadResponse";
import { PostBodyHtmlStoredResponse } from "../Responses/PostBodyHtmlStoredResponse";

export class SupabaseStorePostBodyHtmlHandler implements IHandler<
  StorePostBodyHtmlRequest,
  PostBodyHtmlStoredResponse | PostBodyChangedSinceReadResponse | PostAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: StorePostBodyHtmlRequest,
  ): Promise<
    | PostBodyHtmlStoredResponse
    | PostBodyChangedSinceReadResponse
    | PostAccessFailedResponse
  > {
    const { data, error } = await this.db
      .from("posts")
      .update({ body_html: request.bodyHtml })
      .eq("id", request.id)
      .eq("body_md", request.renderedFrom)
      // Only the id, to learn whether a row matched.
      .select("id");
    if (error) {
      return new PostAccessFailedResponse(request.correlationId, error.message);
    }
    if (data.length === 0) {
      return new PostBodyChangedSinceReadResponse(request.correlationId);
    }
    return new PostBodyHtmlStoredResponse(request.correlationId);
  }
}
