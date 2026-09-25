import type { DbClient, TablesUpdate } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { MediaAssetChanges } from "../MediaAssetChanges";
import type { StoreMediaAssetChangesRequest } from "../Requests/StoreMediaAssetChangesRequest";
import { MediaAssetAccessFailedResponse } from "../Responses/MediaAssetAccessFailedResponse";
import { MediaAssetNotFoundResponse } from "../Responses/MediaAssetNotFoundResponse";
import { MediaAssetStoredResponse } from "../Responses/MediaAssetStoredResponse";
import { MEDIA_ASSET_COLUMNS, toMediaAsset } from "../toMediaAsset";

export class SupabaseStoreMediaAssetChangesHandler implements IHandler<
  StoreMediaAssetChangesRequest,
  MediaAssetStoredResponse | MediaAssetNotFoundResponse | MediaAssetAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: StoreMediaAssetChangesRequest,
  ): Promise<
    MediaAssetStoredResponse | MediaAssetNotFoundResponse | MediaAssetAccessFailedResponse
  > {
    const { id, changes, correlationId } = request;
    const { data, error } = await this.db
      .from("media_assets")
      .update(toColumns(changes))
      .eq("id", id)
      .select(MEDIA_ASSET_COLUMNS)
      .maybeSingle();
    if (error) {
      return new MediaAssetAccessFailedResponse(correlationId, error.message);
    }
    if (data === null) {
      return new MediaAssetNotFoundResponse(correlationId, id);
    }
    return new MediaAssetStoredResponse(correlationId, toMediaAsset(data));
  }
}

function toColumns(changes: MediaAssetChanges): TablesUpdate<"media_assets"> {
  const columns: TablesUpdate<"media_assets"> = {};
  if (changes.mature !== undefined) columns.mature = changes.mature;
  if (changes.publishedPath !== undefined) columns.published_path = changes.publishedPath;
  return columns;
}
