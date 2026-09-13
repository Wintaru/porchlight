import type { IMediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/IMediaAssetAccessor";
import { LoadMediaAssetsByOwnerRequest } from "../../../Accessors/MediaAssetAccessor/Requests/LoadMediaAssetsByOwnerRequest";
import { MediaAssetsLoadedResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetsLoadedResponse";
import type { IMediaStorageAccessor } from "../../../Accessors/MediaStorageAccessor/IMediaStorageAccessor";
import { RemoveStorageObjectRequest } from "../../../Accessors/MediaStorageAccessor/Requests/RemoveStorageObjectRequest";
import { StorageObjectRemovedResponse } from "../../../Accessors/MediaStorageAccessor/Responses/StorageObjectRemovedResponse";
import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import { EraseProfileRequest } from "../../../Accessors/ProfileAccessor/Requests/EraseProfileRequest";
import { ProfileErasedResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileErasedResponse";
import { ProfileNotFoundResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileNotFoundResponse";
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
    for (const asset of loadedMedia.assets.filter(isNotRetained)) {
      const removed = await this.mediaStorage.remove(
        new RemoveStorageObjectRequest(this.quarantineBucket, asset.storagePath, context),
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

function isNotRetained(asset: MediaAsset): boolean {
  return asset.retainUntil === null || asset.retainUntil <= new Date();
}
