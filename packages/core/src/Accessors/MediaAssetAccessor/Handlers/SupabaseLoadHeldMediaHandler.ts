import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadHeldMediaRequest } from "../Requests/LoadHeldMediaRequest";
import { MediaAssetAccessFailedResponse } from "../Responses/MediaAssetAccessFailedResponse";
import { MediaAssetsLoadedResponse } from "../Responses/MediaAssetsLoadedResponse";
import { MEDIA_ASSET_COLUMNS, toMediaAsset } from "../toMediaAsset";

type Result = MediaAssetsLoadedResponse | MediaAssetAccessFailedResponse;

// Served by the partial index `media_assets_held_idx`, whose predicate these filters
// repeat.
export class SupabaseLoadHeldMediaHandler implements IHandler<
  LoadHeldMediaRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: LoadHeldMediaRequest): Promise<Result> {
    const { data, error } = await this.db
      .from("media_assets")
      .select(MEDIA_ASSET_COLUMNS)
      .eq("scan_status", "flagged")
      .eq("mature", false)
      .is("rejected_at", null)
      .order("created_at", { ascending: false })
      .limit(request.limit);
    if (error) {
      return new MediaAssetAccessFailedResponse(request.correlationId, error.message);
    }
    return new MediaAssetsLoadedResponse(request.correlationId, data.map(toMediaAsset));
  }
}
