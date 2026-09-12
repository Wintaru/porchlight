import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { CountMediaForAnonymousAuthorRequest } from "../Requests/CountMediaForAnonymousAuthorRequest";
import { MediaAssetAccessFailedResponse } from "../Responses/MediaAssetAccessFailedResponse";
import { MediaCountResponse } from "../Responses/MediaCountResponse";

export class SupabaseCountMediaForAnonymousAuthorHandler implements IHandler<
  CountMediaForAnonymousAuthorRequest,
  MediaCountResponse | MediaAssetAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: CountMediaForAnonymousAuthorRequest,
  ): Promise<MediaCountResponse | MediaAssetAccessFailedResponse> {
    const { anonymousAuthorId, correlationId } = request;
    const { count, error } = await this.db
      .from("media_assets")
      .select("id", { count: "exact", head: true })
      .eq("anonymous_author_id", anonymousAuthorId);
    if (error) {
      return new MediaAssetAccessFailedResponse(correlationId, error.message);
    }
    return new MediaCountResponse(correlationId, count ?? 0);
  }
}
