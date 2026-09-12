import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadMediaAssetByIdRequest } from "../Requests/LoadMediaAssetByIdRequest";
import { MediaAssetAccessFailedResponse } from "../Responses/MediaAssetAccessFailedResponse";
import { MediaAssetLoadedResponse } from "../Responses/MediaAssetLoadedResponse";
import { MediaAssetNotFoundResponse } from "../Responses/MediaAssetNotFoundResponse";
import { MEDIA_ASSET_COLUMNS, toMediaAsset } from "../toMediaAsset";

type Result =
  MediaAssetLoadedResponse | MediaAssetNotFoundResponse | MediaAssetAccessFailedResponse;

export class SupabaseLoadMediaAssetByIdHandler implements IHandler<
  LoadMediaAssetByIdRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: LoadMediaAssetByIdRequest): Promise<Result> {
    const { id, correlationId } = request;
    const { data, error } = await this.db
      .from("media_assets")
      .select(MEDIA_ASSET_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) {
      return new MediaAssetAccessFailedResponse(correlationId, error.message);
    }
    if (data === null) {
      return new MediaAssetNotFoundResponse(correlationId, id);
    }
    return new MediaAssetLoadedResponse(correlationId, toMediaAsset(data));
  }
}
