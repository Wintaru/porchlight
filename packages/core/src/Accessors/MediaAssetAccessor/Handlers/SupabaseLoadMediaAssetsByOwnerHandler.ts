import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadMediaAssetsByOwnerRequest } from "../Requests/LoadMediaAssetsByOwnerRequest";
import { MediaAssetAccessFailedResponse } from "../Responses/MediaAssetAccessFailedResponse";
import { MediaAssetsLoadedResponse } from "../Responses/MediaAssetsLoadedResponse";
import { MEDIA_ASSET_COLUMNS, toMediaAsset } from "../toMediaAsset";

type Result = MediaAssetsLoadedResponse | MediaAssetAccessFailedResponse;

// One member's uploads is a bounded list, the same assumption LoadPostsByAuthorRequest
// makes: no page here yet.
export class SupabaseLoadMediaAssetsByOwnerHandler implements IHandler<
  LoadMediaAssetsByOwnerRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: LoadMediaAssetsByOwnerRequest): Promise<Result> {
    const { data, error } = await this.db
      .from("media_assets")
      .select(MEDIA_ASSET_COLUMNS)
      .eq("owner_id", request.profileId)
      .order("created_at", { ascending: false });
    if (error) {
      return new MediaAssetAccessFailedResponse(request.correlationId, error.message);
    }
    return new MediaAssetsLoadedResponse(request.correlationId, data.map(toMediaAsset));
  }
}
