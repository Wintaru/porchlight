import type { IMediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/IMediaAssetAccessor";
import { StoreMediaAssetChangesRequest } from "../../../Accessors/MediaAssetAccessor/Requests/StoreMediaAssetChangesRequest";
import { MediaAssetStoredResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetStoredResponse";
import type { IMediaStorageAccessor } from "../../../Accessors/MediaStorageAccessor/IMediaStorageAccessor";
import { DownloadStorageObjectRequest } from "../../../Accessors/MediaStorageAccessor/Requests/DownloadStorageObjectRequest";
import { UploadStorageObjectRequest } from "../../../Accessors/MediaStorageAccessor/Requests/UploadStorageObjectRequest";
import { StorageObjectDownloadedResponse } from "../../../Accessors/MediaStorageAccessor/Responses/StorageObjectDownloadedResponse";
import { StorageObjectUploadedResponse } from "../../../Accessors/MediaStorageAccessor/Responses/StorageObjectUploadedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { MediaAsset } from "../../../Common/MediaAsset";
import type { ResponseBase } from "../../../Common/ResponseBase";
import { extensionOf } from "../../../Utilities/media/extensionOf";
import type { MediaPublishOptions } from "../MediaPublishOptions";
import type { PublishMediaRequest } from "../Requests/PublishMediaRequest";
import { MediaPublishedResponse } from "../Responses/MediaPublishedResponse";
import { MediaUnpublishableResponse } from "../Responses/MediaUnpublishableResponse";
import { MediaPublishUnavailableResponse } from "../Responses/MediaPublishUnavailableResponse";
import { type ReencodedImage, reencodeImage } from "../reencodeImage";

const DOWNLOAD_ONLY_TYPE = "application/octet-stream";

type Result =
  MediaPublishedResponse | MediaUnpublishableResponse | MediaPublishUnavailableResponse;

// The publish sequence (SPEC.md §6, §7, #36): only a cleared or approved upload. An
// image is re-encoded from its quarantine bytes (SPEC.md §7: published image copies are
// re-encoded, metadata stripped); any other file is copied as it is, since it is only
// ever linked as a download from the storage origin (SPEC.md §6). The copy is written
// under the asset's own id in the public bucket, and only then recorded on the row — so
// `publishedPath` never names an object that is not there. Publishing an asset that
// already has a copy is a no-op.
export class TransformPublishMediaHandler implements IHandler<
  PublishMediaRequest,
  Result
> {
  constructor(
    private readonly storage: IMediaStorageAccessor,
    private readonly mediaAssets: IMediaAssetAccessor,
    private readonly options: MediaPublishOptions,
  ) {}

  async handle(request: PublishMediaRequest): Promise<Result> {
    const { correlationId, asset, originalBytes, timestamp } = request;
    const context = { correlationId, timestamp };
    // A flagged image publishes only once a moderator approved it as mature.
    const cleared =
      asset.scanStatus === "clear" || (asset.scanStatus === "flagged" && asset.mature);
    if (!cleared) {
      return new MediaUnpublishableResponse(correlationId, "not-cleared");
    }
    if (asset.publishedPath !== null) {
      return new MediaPublishedResponse(correlationId, asset);
    }

    let bytes = originalBytes;
    if (bytes === undefined) {
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
      bytes = downloaded.bytes;
    }

    const copy = await publicCopyOf(asset, bytes, correlationId);
    if (copy instanceof MediaUnpublishableResponse) {
      return copy;
    }

    const key = `${asset.id}.${copy.extension}`;
    const uploaded = await this.storage.store(
      new UploadStorageObjectRequest(
        this.options.publicBucket,
        key,
        copy.bytes,
        copy.mimeType,
        context,
      ),
    );
    if (!(uploaded instanceof StorageObjectUploadedResponse)) {
      return unavailable(correlationId, uploaded, "storage.store");
    }

    const stored = await this.mediaAssets.store(
      new StoreMediaAssetChangesRequest(
        asset.id,
        { publishedPath: `${this.options.publicBucket}/${key}` },
        context,
      ),
    );
    if (!(stored instanceof MediaAssetStoredResponse)) {
      return unavailable(correlationId, stored, "mediaAssets.store");
    }
    return new MediaPublishedResponse(correlationId, stored.asset);
  }
}

// The bytes the public bucket gets: a fresh encode for an image, the file itself for
// anything else. The extension comes from the stored type, never the uploader's name.
async function publicCopyOf(
  asset: MediaAsset,
  bytes: Uint8Array,
  correlationId: string,
): Promise<ReencodedImage | MediaUnpublishableResponse> {
  if (asset.kind !== "image") {
    // Stored as bytes to download, whatever the file is: a type the browser renders
    // (GPX is XML, and XML can carry script) must never be served as itself.
    return {
      bytes,
      mimeType: DOWNLOAD_ONLY_TYPE,
      extension: extensionOf(asset.originalFilename) ?? "bin",
    };
  }
  try {
    const reencoded = await reencodeImage(bytes, asset.mimeType);
    if (reencoded !== undefined) {
      return reencoded;
    }
  } catch (error) {
    console.warn(`image ${asset.id} did not decode [${correlationId}]`, error);
  }
  return new MediaUnpublishableResponse(correlationId, "undecodable");
}

function unavailable(
  correlationId: string,
  response: ResponseBase,
  method: string,
): MediaPublishUnavailableResponse {
  const reason =
    "reason" in response && typeof response.reason === "string"
      ? response.reason
      : `unexpected ${response.constructor.name} from ${method}`;
  return new MediaPublishUnavailableResponse(correlationId, reason);
}
