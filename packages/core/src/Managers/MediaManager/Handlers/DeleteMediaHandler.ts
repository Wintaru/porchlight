import type { IMediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/IMediaAssetAccessor";
import { LoadMediaAssetByIdRequest } from "../../../Accessors/MediaAssetAccessor/Requests/LoadMediaAssetByIdRequest";
import { LoadMediaInUseRequest } from "../../../Accessors/MediaAssetAccessor/Requests/LoadMediaInUseRequest";
import { MediaAssetLoadedResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetLoadedResponse";
import { MediaAssetNotFoundResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetNotFoundResponse";
import { MediaInUseLoadedResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaInUseLoadedResponse";
import type { IMediaStorageAccessor } from "../../../Accessors/MediaStorageAccessor/IMediaStorageAccessor";
import type { IQuotaAccessor } from "../../../Accessors/QuotaAccessor/IQuotaAccessor";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import type { MediaManagerOptions } from "../MediaManagerOptions";
import { permit } from "../permit";
import { removeUpload } from "../removeUpload";
import type { DeleteMediaRequest } from "../Requests/DeleteMediaRequest";
import type { MediaDeletedResponse } from "../Responses/MediaDeletedResponse";
import type { MediaForbiddenResponse } from "../Responses/MediaForbiddenResponse";
import { MediaInUseResponse } from "../Responses/MediaInUseResponse";
import { NoSuchMediaResponse } from "../Responses/NoSuchMediaResponse";
import type { MediaUnavailableResponse } from "../Responses/MediaUnavailableResponse";
import { unavailable } from "../unavailable";

export type DeleteMediaResult =
  | MediaDeletedResponse
  | NoSuchMediaResponse
  | MediaForbiddenResponse
  | MediaInUseResponse
  | MediaUnavailableResponse;

// A member's Remove. Refused while any post or comment, anyone's, still shows the
// upload (#90, C12): deleting it would break that picture, so the member takes it out
// there first. The delete itself is removeUpload's, shared with the prune.
export class DeleteMediaHandler implements IHandler<
  DeleteMediaRequest,
  DeleteMediaResult
> {
  constructor(
    private readonly storage: IMediaStorageAccessor,
    private readonly mediaAssets: IMediaAssetAccessor,
    private readonly quotas: IQuotaAccessor,
    private readonly permissions: IPermissionEngine,
    private readonly options: MediaManagerOptions,
  ) {}

  async handle(request: DeleteMediaRequest): Promise<DeleteMediaResult> {
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

    const inUse = await this.mediaAssets.load(
      new LoadMediaInUseRequest(mediaId, context),
    );
    if (!(inUse instanceof MediaInUseLoadedResponse)) {
      return unavailable(correlationId, inUse, "mediaAssets.load");
    }
    if (inUse.inUse) {
      return new MediaInUseResponse(correlationId, mediaId);
    }

    return removeUpload(
      {
        storage: this.storage,
        mediaAssets: this.mediaAssets,
        quotas: this.quotas,
        options: this.options,
      },
      asset,
      context,
    );
  }
}
