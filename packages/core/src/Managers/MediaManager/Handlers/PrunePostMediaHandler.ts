import type { IMediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/IMediaAssetAccessor";
import { LoadMediaAssetsByOwnerRequest } from "../../../Accessors/MediaAssetAccessor/Requests/LoadMediaAssetsByOwnerRequest";
import { MediaAssetsLoadedResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetsLoadedResponse";
import type { IMediaStorageAccessor } from "../../../Accessors/MediaStorageAccessor/IMediaStorageAccessor";
import type { IQuotaAccessor } from "../../../Accessors/QuotaAccessor/IQuotaAccessor";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { postUsesMedia } from "../../../Utilities/media/postUsesMedia";
import type { MediaManagerOptions } from "../MediaManagerOptions";
import { ownerIdOf } from "../ownerIdOf";
import { pruneUnused } from "../pruneUnused";
import type { PrunePostMediaRequest } from "../Requests/PrunePostMediaRequest";
import { MediaForbiddenResponse } from "../Responses/MediaForbiddenResponse";
import type { MediaPrunedResponse } from "../Responses/MediaPrunedResponse";
import type { MediaUnavailableResponse } from "../Responses/MediaUnavailableResponse";
import { unavailable } from "../unavailable";

type Result = MediaPrunedResponse | MediaForbiddenResponse | MediaUnavailableResponse;

// The prune after an explicit save, for the editor and for an agent alike (#80, #90).
// Only an upload a saved version used can have been taken out: one uploaded and not put
// in yet stays for later. An upload the text this save wrote uses is set aside here,
// before the database looks at the stored row, so a late autosave that wrote older
// text since cannot get a file deleted that the author just put back.
export class PrunePostMediaHandler implements IHandler<PrunePostMediaRequest, Result> {
  constructor(
    private readonly storage: IMediaStorageAccessor,
    private readonly mediaAssets: IMediaAssetAccessor,
    private readonly quotas: IQuotaAccessor,
    private readonly permissions: IPermissionEngine,
    private readonly options: MediaManagerOptions,
  ) {}

  async handle(request: PrunePostMediaRequest): Promise<Result> {
    const { correlationId, actor, postId, saved } = request;
    const context = { correlationId };
    const ownerId = ownerIdOf(actor);
    if (ownerId === undefined) {
      return new MediaForbiddenResponse(correlationId, "signed-out");
    }

    const loaded = await this.mediaAssets.load(
      new LoadMediaAssetsByOwnerRequest(ownerId, context, {
        postId,
        excludeLocked: true,
      }),
    );
    if (!(loaded instanceof MediaAssetsLoadedResponse)) {
      return unavailable(correlationId, loaded, "mediaAssets.load");
    }
    const takenOut = loaded.assets.filter(
      (asset) => asset.usedInPost && !postUsesMedia(saved, asset.id),
    );

    return pruneUnused(
      {
        storage: this.storage,
        mediaAssets: this.mediaAssets,
        quotas: this.quotas,
        options: this.options,
      },
      this.permissions,
      actor,
      ownerId,
      takenOut,
      postId,
      context,
    );
  }
}
