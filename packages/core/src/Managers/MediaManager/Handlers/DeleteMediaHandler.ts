import type { IMediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/IMediaAssetAccessor";
import { LoadMediaAssetByIdRequest } from "../../../Accessors/MediaAssetAccessor/Requests/LoadMediaAssetByIdRequest";
import { RemoveMediaAssetRequest } from "../../../Accessors/MediaAssetAccessor/Requests/RemoveMediaAssetRequest";
import { MediaAssetLoadedResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetLoadedResponse";
import { MediaAssetNotFoundResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetNotFoundResponse";
import { MediaAssetRemovedResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetRemovedResponse";
import { MediaAssetRetainedResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetRetainedResponse";
import type { IMediaStorageAccessor } from "../../../Accessors/MediaStorageAccessor/IMediaStorageAccessor";
import { RemoveStorageObjectRequest } from "../../../Accessors/MediaStorageAccessor/Requests/RemoveStorageObjectRequest";
import { StorageObjectRemovedResponse } from "../../../Accessors/MediaStorageAccessor/Responses/StorageObjectRemovedResponse";
import type { IQuotaAccessor } from "../../../Accessors/QuotaAccessor/IQuotaAccessor";
import { AdjustQuotaUsageRequest } from "../../../Accessors/QuotaAccessor/Requests/AdjustQuotaUsageRequest";
import { QuotaUsageStoredResponse } from "../../../Accessors/QuotaAccessor/Responses/QuotaUsageStoredResponse";
import { publishedObjectOf } from "../../../Utilities/media/publishedObjectOf";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import type { MediaManagerOptions } from "../MediaManagerOptions";
import { permit } from "../permit";
import type { DeleteMediaRequest } from "../Requests/DeleteMediaRequest";
import { MediaDeletedResponse } from "../Responses/MediaDeletedResponse";
import { MediaForbiddenResponse } from "../Responses/MediaForbiddenResponse";
import { NoSuchMediaResponse } from "../Responses/NoSuchMediaResponse";
import type { MediaUnavailableResponse } from "../Responses/MediaUnavailableResponse";
import { unavailable } from "../unavailable";

type Result =
  | MediaDeletedResponse
  | NoSuchMediaResponse
  | MediaForbiddenResponse
  | MediaUnavailableResponse;

// Storage first, then the row, then the quota: if the storage delete fails the row and
// the quota are untouched, so the whole delete is safe to retry. Deleting the row first
// would leave an orphaned quarantine object with nothing pointing at it if the storage
// call then failed.
export class DeleteMediaHandler implements IHandler<DeleteMediaRequest, Result> {
  constructor(
    private readonly storage: IMediaStorageAccessor,
    private readonly mediaAssets: IMediaAssetAccessor,
    private readonly quotas: IQuotaAccessor,
    private readonly permissions: IPermissionEngine,
    private readonly options: MediaManagerOptions,
  ) {}

  async handle(request: DeleteMediaRequest): Promise<Result> {
    const { correlationId, actor, mediaId } = request;
    const context = { correlationId };

    const loaded = await this.mediaAssets.load(
      new LoadMediaAssetByIdRequest(mediaId, context),
    );
    if (loaded instanceof MediaAssetNotFoundResponse) {
      return new NoSuchMediaResponse(correlationId, mediaId);
    }
    if (!(loaded instanceof MediaAssetLoadedResponse)) {
      return unavailable(correlationId, loaded, "mediaAssets.load");
    }
    const { asset } = loaded;

    const refused = await permit(
      this.permissions,
      actor,
      "media.delete",
      {
        kind: "media",
        id: mediaId,
        owner: asset.owner,
        publishedPath: asset.publishedPath,
        scanStatus: asset.scanStatus,
      },
      context,
    );
    if (refused !== undefined) {
      return refused;
    }
    // A locked item outlives its retention period regardless of who asks (SPEC.md §7);
    // nothing this issue builds ever locks one, but the row's own trigger enforces it
    // either way — this is the friendlier message ahead of that trigger firing.
    if (asset.retainUntil !== null && asset.retainUntil > new Date()) {
      return new MediaForbiddenResponse(correlationId, "not-allowed");
    }

    const removedObject = await this.storage.remove(
      new RemoveStorageObjectRequest(
        this.options.quarantineBucket,
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
      const removedCopy = await this.storage.remove(
        new RemoveStorageObjectRequest(published.bucket, published.path, context),
      );
      if (!(removedCopy instanceof StorageObjectRemovedResponse)) {
        return unavailable(correlationId, removedCopy, "storage.remove");
      }
    }

    const removedRow = await this.mediaAssets.remove(
      new RemoveMediaAssetRequest(mediaId, context),
    );
    if (removedRow instanceof MediaAssetRetainedResponse) {
      return new MediaForbiddenResponse(correlationId, "not-allowed");
    }
    if (!(removedRow instanceof MediaAssetRemovedResponse)) {
      return unavailable(correlationId, removedRow, "mediaAssets.remove");
    }

    if (asset.owner.kind === "member") {
      const adjusted = await this.quotas.store(
        new AdjustQuotaUsageRequest(asset.owner.profileId, -asset.bytes, -1, context),
      );
      if (!(adjusted instanceof QuotaUsageStoredResponse)) {
        return unavailable(correlationId, adjusted, "quotas.store");
      }
    }
    return new MediaDeletedResponse(correlationId);
  }
}
