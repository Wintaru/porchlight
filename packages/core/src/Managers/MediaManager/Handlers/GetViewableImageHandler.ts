import type { IMediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/IMediaAssetAccessor";
import { LoadMediaAssetByIdRequest } from "../../../Accessors/MediaAssetAccessor/Requests/LoadMediaAssetByIdRequest";
import { MediaAssetLoadedResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetLoadedResponse";
import { MediaAssetNotFoundResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetNotFoundResponse";
import type { IMediaStorageAccessor } from "../../../Accessors/MediaStorageAccessor/IMediaStorageAccessor";
import { DownloadStorageObjectRequest } from "../../../Accessors/MediaStorageAccessor/Requests/DownloadStorageObjectRequest";
import { StorageObjectDownloadedResponse } from "../../../Accessors/MediaStorageAccessor/Responses/StorageObjectDownloadedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { scannableImage } from "../../../Utilities/media/scannableImage";
import type { MediaManagerOptions } from "../MediaManagerOptions";
import { permit } from "../permit";
import type { GetViewableImageRequest } from "../Requests/GetViewableImageRequest";
import type { MediaForbiddenResponse } from "../Responses/MediaForbiddenResponse";
import { MediaUnavailableResponse } from "../Responses/MediaUnavailableResponse";
import { NoSuchMediaResponse } from "../Responses/NoSuchMediaResponse";
import { ViewableImageResponse } from "../Responses/ViewableImageResponse";
import { unavailable } from "../unavailable";

type Result =
  | ViewableImageResponse
  | NoSuchMediaResponse
  | MediaForbiddenResponse
  | MediaUnavailableResponse;

// Same wall as GetMedia (`media.view`): the owner and staff, never a locked upload.
// Only an image: a video plays from its signed link as it is.
export class GetViewableImageHandler implements IHandler<
  GetViewableImageRequest,
  Result
> {
  constructor(
    private readonly storage: IMediaStorageAccessor,
    private readonly mediaAssets: IMediaAssetAccessor,
    private readonly permissions: IPermissionEngine,
    private readonly options: MediaManagerOptions,
  ) {}

  async handle(request: GetViewableImageRequest): Promise<Result> {
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
      "media.view",
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
    if (asset.kind !== "image") {
      return new NoSuchMediaResponse(correlationId, mediaId);
    }

    const downloaded = await this.storage.load(
      new DownloadStorageObjectRequest(
        this.options.quarantineBucket,
        asset.storagePath,
        context,
      ),
    );
    if (!(downloaded instanceof StorageObjectDownloadedResponse)) {
      return unavailable(correlationId, downloaded, "storage.load");
    }
    try {
      const viewable = await scannableImage(downloaded.bytes, asset.mimeType);
      return new ViewableImageResponse(correlationId, viewable.bytes, viewable.mimeType);
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : String(error);
      return new MediaUnavailableResponse(correlationId, `decode failed: ${reason}`);
    }
  }
}
