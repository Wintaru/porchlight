import type { IMediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/IMediaAssetAccessor";
import { LoadMediaAssetByIdRequest } from "../../../Accessors/MediaAssetAccessor/Requests/LoadMediaAssetByIdRequest";
import { MediaAssetLoadedResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetLoadedResponse";
import { MediaAssetNotFoundResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetNotFoundResponse";
import type { IMediaStorageAccessor } from "../../../Accessors/MediaStorageAccessor/IMediaStorageAccessor";
import { CreateSignedDownloadUrlRequest } from "../../../Accessors/MediaStorageAccessor/Requests/CreateSignedDownloadUrlRequest";
import { SignedDownloadUrlCreatedResponse } from "../../../Accessors/MediaStorageAccessor/Responses/SignedDownloadUrlCreatedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import type { MediaManagerOptions } from "../MediaManagerOptions";
import { permit } from "../permit";
import type { GetMediaRequest } from "../Requests/GetMediaRequest";
import type { MediaForbiddenResponse } from "../Responses/MediaForbiddenResponse";
import { MediaResponse } from "../Responses/MediaResponse";
import type { MediaUnavailableResponse } from "../Responses/MediaUnavailableResponse";
import { NoSuchMediaResponse } from "../Responses/NoSuchMediaResponse";
import { unavailable } from "../unavailable";

type Result =
  MediaResponse | NoSuchMediaResponse | MediaForbiddenResponse | MediaUnavailableResponse;

// `publishedPath` stays null for everything this issue creates (#10/#11 are the only
// things that ever set it), so every read today comes from quarantine, under the owner
// gate `mayViewMedia` falls back to for an unpublished item.
export class GetMediaHandler implements IHandler<GetMediaRequest, Result> {
  constructor(
    private readonly storage: IMediaStorageAccessor,
    private readonly mediaAssets: IMediaAssetAccessor,
    private readonly permissions: IPermissionEngine,
    private readonly options: MediaManagerOptions,
  ) {}

  async handle(request: GetMediaRequest): Promise<Result> {
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
      },
      context,
    );
    if (refused !== undefined) {
      return refused;
    }

    const forceDownload = asset.kind === "image" ? false : asset.originalFilename;
    const signed = await this.storage.load(
      new CreateSignedDownloadUrlRequest(
        this.options.quarantineBucket,
        asset.storagePath,
        forceDownload,
        context,
      ),
    );
    if (!(signed instanceof SignedDownloadUrlCreatedResponse)) {
      return unavailable(correlationId, signed, "storage.load");
    }
    return new MediaResponse(correlationId, asset, signed.signedUrl);
  }
}
