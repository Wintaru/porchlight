import type { DbClient, TablesInsert } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { NewMediaAsset } from "../NewMediaAsset";
import type { StoreNewMediaAssetRequest } from "../Requests/StoreNewMediaAssetRequest";
import { MediaAssetAccessFailedResponse } from "../Responses/MediaAssetAccessFailedResponse";
import { MediaAssetStoredResponse } from "../Responses/MediaAssetStoredResponse";
import { MEDIA_ASSET_COLUMNS, toMediaAsset } from "../toMediaAsset";

export class SupabaseStoreNewMediaAssetHandler implements IHandler<
  StoreNewMediaAssetRequest,
  MediaAssetStoredResponse | MediaAssetAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: StoreNewMediaAssetRequest,
  ): Promise<MediaAssetStoredResponse | MediaAssetAccessFailedResponse> {
    const { asset, correlationId } = request;
    const { data, error } = await this.db
      .from("media_assets")
      .insert(toInsert(asset))
      .select(MEDIA_ASSET_COLUMNS)
      .single();
    if (error) {
      return new MediaAssetAccessFailedResponse(correlationId, error.message);
    }
    return new MediaAssetStoredResponse(correlationId, toMediaAsset(data));
  }
}

function toInsert(asset: NewMediaAsset): TablesInsert<"media_assets"> {
  return {
    id: asset.id,
    owner_id: asset.owner.kind === "member" ? asset.owner.profileId : null,
    anonymous_author_id:
      asset.owner.kind === "anonymous" ? asset.owner.anonymousAuthorId : null,
    storage_path: asset.storagePath,
    kind: asset.kind,
    mime_type: asset.mimeType,
    original_filename: asset.originalFilename,
    bytes: asset.bytes,
    sha256: asset.sha256,
  };
}
