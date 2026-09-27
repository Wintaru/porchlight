import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { StorePostBodyHtmlRequest } from "../Requests/StorePostBodyHtmlRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostBodyHtmlStoredResponse } from "../Responses/PostBodyHtmlStoredResponse";

export class SupabaseStorePostBodyHtmlHandler implements IHandler<
  StorePostBodyHtmlRequest,
  PostBodyHtmlStoredResponse | PostAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: StorePostBodyHtmlRequest,
  ): Promise<PostBodyHtmlStoredResponse | PostAccessFailedResponse> {
    const { error } = await this.db
      .from("posts")
      .update({ body_html: request.bodyHtml })
      .eq("id", request.id);
    if (error) {
      return new PostAccessFailedResponse(request.correlationId, error.message);
    }
    return new PostBodyHtmlStoredResponse(request.correlationId);
  }
}
