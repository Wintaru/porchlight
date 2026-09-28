import type { IMediaAssetAccessor } from "../../Accessors/MediaAssetAccessor/IMediaAssetAccessor";
import { RemoveMediaAssetRequest } from "../../Accessors/MediaAssetAccessor/Requests/RemoveMediaAssetRequest";
import { MediaAssetRemovedResponse } from "../../Accessors/MediaAssetAccessor/Responses/MediaAssetRemovedResponse";
import { MediaAssetRetainedResponse } from "../../Accessors/MediaAssetAccessor/Responses/MediaAssetRetainedResponse";
import type { IMediaStorageAccessor } from "../../Accessors/MediaStorageAccessor/IMediaStorageAccessor";
import { RemoveStorageObjectRequest } from "../../Accessors/MediaStorageAccessor/Requests/RemoveStorageObjectRequest";
import { StorageObjectRemovedResponse } from "../../Accessors/MediaStorageAccessor/Responses/StorageObjectRemovedResponse";
import type { IQuotaAccessor } from "../../Accessors/QuotaAccessor/IQuotaAccessor";
import { AdjustQuotaUsageRequest } from "../../Accessors/QuotaAccessor/Requests/AdjustQuotaUsageRequest";
import { QuotaUsageStoredResponse } from "../../Accessors/QuotaAccessor/Responses/QuotaUsageStoredResponse";
import type { MediaAsset } from "../../Common/MediaAsset";
import type { RequestContext } from "../../Common/RequestContext";
import { publishedObjectOf } from "../../Utilities/media/publishedObjectOf";
import type { MediaManagerOptions } from "./MediaManagerOptions";
import { MediaDeletedResponse } from "./Responses/MediaDeletedResponse";
import { MediaForbiddenResponse } from "./Responses/MediaForbiddenResponse";
import type { MediaUnavailableResponse } from "./Responses/MediaUnavailableResponse";
import { unavailable } from "./unavailable";

export interface UploadStores {
  readonly storage: IMediaStorageAccessor;
  readonly mediaAssets: IMediaAssetAccessor;
  readonly quotas: IQuotaAccessor;
  readonly options: MediaManagerOptions;
}

// Deletes one upload the caller already may delete: DeleteMedia after its checks, and
// the prune after its own (#90). Storage first, then the row, then the quota: if the
// storage delete fails the row and the quota are untouched, so the whole delete is safe
// to retry. Deleting the row first would leave an orphaned quarantine object with
// nothing pointing at it if the storage call then failed.
export async function removeUpload(
  stores: UploadStores,
  asset: MediaAsset,
  context: Required<Pick<RequestContext, "correlationId">>,
): Promise<MediaDeletedResponse | MediaForbiddenResponse | MediaUnavailableResponse> {
  const { correlationId } = context;
  // A locked item outlives its retention period regardless of who asks (SPEC.md §7).
  // The row's own trigger enforces it either way; this check comes first so the storage
  // objects are never touched for a row that cannot go.
  if (asset.retainUntil !== null && asset.retainUntil > new Date()) {
    return new MediaForbiddenResponse(correlationId, "not-allowed");
  }

  const removedObject = await stores.storage.remove(
    new RemoveStorageObjectRequest(
      stores.options.quarantineBucket,
      asset.storagePath,
      context,
    ),
  );
  if (!(removedObject instanceof StorageObjectRemovedResponse)) {
    return unavailable(correlationId, removedObject, "storage.remove");
  }
  // The public copy goes too (#36): a deleted upload must not stay reachable by URL.
  const published =
    asset.publishedPath === null ? undefined : publishedObjectOf(asset.publishedPath);
  if (published !== undefined) {
    const removedCopy = await stores.storage.remove(
      new RemoveStorageObjectRequest(published.bucket, published.path, context),
    );
    if (!(removedCopy instanceof StorageObjectRemovedResponse)) {
      return unavailable(correlationId, removedCopy, "storage.remove");
    }
  }

  const removedRow = await stores.mediaAssets.remove(
    new RemoveMediaAssetRequest(asset.id, context),
  );
  if (removedRow instanceof MediaAssetRetainedResponse) {
    return new MediaForbiddenResponse(correlationId, "not-allowed");
  }
  if (!(removedRow instanceof MediaAssetRemovedResponse)) {
    return unavailable(correlationId, removedRow, "mediaAssets.remove");
  }

  if (asset.owner.kind === "member") {
    const adjusted = await stores.quotas.store(
      new AdjustQuotaUsageRequest(asset.owner.profileId, -asset.bytes, -1, context),
    );
    if (!(adjusted instanceof QuotaUsageStoredResponse)) {
      return unavailable(correlationId, adjusted, "quotas.store");
    }
  }
  return new MediaDeletedResponse(correlationId);
}
