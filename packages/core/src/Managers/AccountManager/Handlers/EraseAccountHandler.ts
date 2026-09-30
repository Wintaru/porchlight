import type { IMediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/IMediaAssetAccessor";
import { LoadMediaAssetsByOwnerRequest } from "../../../Accessors/MediaAssetAccessor/Requests/LoadMediaAssetsByOwnerRequest";
import { MediaAssetsLoadedResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetsLoadedResponse";
import type { IMediaStorageAccessor } from "../../../Accessors/MediaStorageAccessor/IMediaStorageAccessor";
import { RemoveStorageObjectsRequest } from "../../../Accessors/MediaStorageAccessor/Requests/RemoveStorageObjectsRequest";
import { StorageObjectRemovedResponse } from "../../../Accessors/MediaStorageAccessor/Responses/StorageObjectRemovedResponse";
import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import { EraseProfileRequest } from "../../../Accessors/ProfileAccessor/Requests/EraseProfileRequest";
import { ProfileErasedResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileErasedResponse";
import { ProfileNotFoundResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileNotFoundResponse";
import { publishedObjectOf } from "../../../Utilities/media/publishedObjectOf";
import type { IHandler } from "../../../Common/IHandler";
import type { MediaAsset } from "../../../Common/MediaAsset";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { permit } from "../permit";
import type { EraseAccountRequest } from "../Requests/EraseAccountRequest";
import { AccountErasedResponse } from "../Responses/AccountErasedResponse";
import type { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import type { ActionForbiddenResponse } from "../Responses/ActionForbiddenResponse";
import { NoSuchProfileResponse } from "../Responses/NoSuchProfileResponse";
import { unavailable } from "../unavailable";

type Result =
  | AccountErasedResponse
  | NoSuchProfileResponse
  | ActionForbiddenResponse
  | AccountUnavailableResponse;

// Storage first, then `erase_account`'s one transaction, then the auth user
// (SPEC.md §10) — the same "storage first" safety DeleteMediaHandler already uses: if a
// storage removal fails, nothing in the database has changed yet, so the whole erasure
// is safe to retry. `erase_account` independently re-applies the same retention filter,
// so a media row that turns retained between the load below and the call still survives
// (frozen evidence is never skipped by a race, only by staying frozen).
export class EraseAccountHandler implements IHandler<EraseAccountRequest, Result> {
  constructor(
    private readonly profiles: IProfileAccessor,
    private readonly mediaAssets: IMediaAssetAccessor,
    private readonly mediaStorage: IMediaStorageAccessor,
    private readonly permissions: IPermissionEngine,
    private readonly quarantineBucket: string,
  ) {}

  async handle(request: EraseAccountRequest): Promise<Result> {
    const { correlationId, actor, profileId } = request;
    const context = { correlationId };

    const refused = await permit(
      this.permissions,
      actor,
      "account.erase",
      { kind: "profile", id: profileId },
      context,
    );
    if (refused !== undefined) {
      return refused;
    }

    const loadedMedia = await this.mediaAssets.load(
      new LoadMediaAssetsByOwnerRequest(profileId, context),
    );
    if (!(loadedMedia instanceof MediaAssetsLoadedResponse)) {
      return unavailable(correlationId, loadedMedia, "mediaAssets.load");
    }
    for (const [bucket, paths] of storedObjectsOf(
      loadedMedia.assets.filter(isNotRetained),
      this.quarantineBucket,
    )) {
      const removed = await this.mediaStorage.remove(
        new RemoveStorageObjectsRequest(bucket, paths, context),
      );
      if (!(removed instanceof StorageObjectRemovedResponse)) {
        return unavailable(correlationId, removed, "mediaStorage.remove");
      }
    }

    const erased = await this.profiles.store(new EraseProfileRequest(profileId, context));
    if (erased instanceof ProfileErasedResponse) {
      return new AccountErasedResponse(correlationId);
    }
    if (erased instanceof ProfileNotFoundResponse) {
      return new NoSuchProfileResponse(correlationId);
    }
    return unavailable(correlationId, erased, "profiles.store");
  }
}

// The quarantine original of each upload and, once there is one, its public copy (#36),
// grouped by bucket so each bucket is emptied in as few calls as Storage allows.
function storedObjectsOf(
  assets: readonly MediaAsset[],
  quarantineBucket: string,
): ReadonlyMap<string, readonly string[]> {
  const byBucket = new Map<string, string[]>();
  const add = (bucket: string, path: string) => {
    const paths = byBucket.get(bucket) ?? [];
    paths.push(path);
    byBucket.set(bucket, paths);
  };
  for (const asset of assets) {
    add(quarantineBucket, asset.storagePath);
    const published =
      asset.publishedPath === null ? undefined : publishedObjectOf(asset.publishedPath);
    if (published !== undefined) {
      add(published.bucket, published.path);
    }
  }
  return byBucket;
}

function isNotRetained(asset: MediaAsset): boolean {
  return asset.retainUntil === null || asset.retainUntil <= new Date();
}
