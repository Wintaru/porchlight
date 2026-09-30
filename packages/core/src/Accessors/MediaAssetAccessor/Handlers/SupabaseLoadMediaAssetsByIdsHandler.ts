import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import { chunked } from "../../../Utilities/collections/chunked";
import type { LoadMediaAssetsByIdsRequest } from "../Requests/LoadMediaAssetsByIdsRequest";
import { MediaAssetAccessFailedResponse } from "../Responses/MediaAssetAccessFailedResponse";
import { MediaAssetsLoadedResponse } from "../Responses/MediaAssetsLoadedResponse";
import { MEDIA_ASSET_COLUMNS, toMediaAsset } from "../toMediaAsset";

type Result = MediaAssetsLoadedResponse | MediaAssetAccessFailedResponse;

const IDS_PER_QUERY = 100;

export class SupabaseLoadMediaAssetsByIdsHandler implements IHandler<
  LoadMediaAssetsByIdsRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: LoadMediaAssetsByIdsRequest): Promise<Result> {
    const reads = await Promise.all(
      chunked([...new Set(request.ids)], IDS_PER_QUERY).map((ids) =>
        this.db.from("media_assets").select(MEDIA_ASSET_COLUMNS).in("id", ids),
      ),
    );
    const failed = reads.find((read) => read.error !== null);
    if (failed?.error) {
      return new MediaAssetAccessFailedResponse(
        request.correlationId,
        failed.error.message,
      );
    }
    return new MediaAssetsLoadedResponse(
      request.correlationId,
      reads.flatMap((read) => (read.data ?? []).map(toMediaAsset)),
    );
  }
}
