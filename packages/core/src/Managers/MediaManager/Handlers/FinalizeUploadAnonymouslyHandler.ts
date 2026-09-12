import type { IAnonymousAuthorAccessor } from "../../../Accessors/AnonymousAuthorAccessor/IAnonymousAuthorAccessor";
import { AnonymousAuthorLoadedResponse } from "../../../Accessors/AnonymousAuthorAccessor/Responses/AnonymousAuthorLoadedResponse";
import type { IMediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/IMediaAssetAccessor";
import { CountMediaForAnonymousAuthorRequest } from "../../../Accessors/MediaAssetAccessor/Requests/CountMediaForAnonymousAuthorRequest";
import { StoreNewMediaAssetRequest } from "../../../Accessors/MediaAssetAccessor/Requests/StoreNewMediaAssetRequest";
import { MediaAssetStoredResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetStoredResponse";
import { MediaCountResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaCountResponse";
import type { IMediaStorageAccessor } from "../../../Accessors/MediaStorageAccessor/IMediaStorageAccessor";
import { DownloadStorageObjectRequest } from "../../../Accessors/MediaStorageAccessor/Requests/DownloadStorageObjectRequest";
import { RemoveStorageObjectRequest } from "../../../Accessors/MediaStorageAccessor/Requests/RemoveStorageObjectRequest";
import { StorageObjectDownloadedResponse } from "../../../Accessors/MediaStorageAccessor/Responses/StorageObjectDownloadedResponse";
import type { ISiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/ISiteConfigAccessor";
import { LoadAnonymousUploadCapRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadAnonymousUploadCapRequest";
import { LoadAttachmentAllowlistRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadAttachmentAllowlistRequest";
import { AnonymousUploadCapLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/AnonymousUploadCapLoadedResponse";
import { AttachmentAllowlistLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/AttachmentAllowlistLoadedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IAttachmentEngine } from "../../../Engines/AttachmentEngine/IAttachmentEngine";
import { ClassifyAttachmentRequest } from "../../../Engines/AttachmentEngine/Requests/ClassifyAttachmentRequest";
import { AttachmentClassifiedResponse } from "../../../Engines/AttachmentEngine/Responses/AttachmentClassifiedResponse";
import { AttachmentRejectedResponse } from "../../../Engines/AttachmentEngine/Responses/AttachmentRejectedResponse";
import type { IQuotaEngine } from "../../../Engines/QuotaEngine/IQuotaEngine";
import { EvaluateQuotaRequest } from "../../../Engines/QuotaEngine/Requests/EvaluateQuotaRequest";
import { QuotaAllowedResponse } from "../../../Engines/QuotaEngine/Responses/QuotaAllowedResponse";
import { QuotaExceededResponse } from "../../../Engines/QuotaEngine/Responses/QuotaExceededResponse";
import { sha256HexOfBytes } from "../../../Utilities/media/sha256HexOfBytes";
import { findAnonymousAuthor } from "../findAnonymousAuthor";
import { mediaStoragePath } from "../mediaStoragePath";
import type { MediaManagerOptions } from "../MediaManagerOptions";
import type { FinalizeUploadAnonymouslyRequest } from "../Requests/FinalizeUploadAnonymouslyRequest";
import { MediaFinalizedResponse } from "../Responses/MediaFinalizedResponse";
import { MediaQuotaExceededResponse } from "../Responses/MediaQuotaExceededResponse";
import { MediaRejectedResponse } from "../Responses/MediaRejectedResponse";
import { MediaUnavailableResponse } from "../Responses/MediaUnavailableResponse";
import { unavailable } from "../unavailable";

type Result =
  | MediaFinalizedResponse
  | MediaRejectedResponse
  | MediaQuotaExceededResponse
  | MediaUnavailableResponse;

// Confirms a visitor's own upload, the anonymous mirror of FinalizeUploadHandler: no
// actor, no permission check — holding the cookie secret is the only proof of ownership
// an anonymous author has, and it is what the storage path is derived from.
export class FinalizeUploadAnonymouslyHandler implements IHandler<
  FinalizeUploadAnonymouslyRequest,
  Result
> {
  constructor(
    private readonly storage: IMediaStorageAccessor,
    private readonly mediaAssets: IMediaAssetAccessor,
    private readonly siteConfig: ISiteConfigAccessor,
    private readonly authors: IAnonymousAuthorAccessor,
    private readonly attachments: IAttachmentEngine,
    private readonly quotaEngine: IQuotaEngine,
    private readonly options: MediaManagerOptions,
  ) {}

  async handle(request: FinalizeUploadAnonymouslyRequest): Promise<Result> {
    const { correlationId, mediaId, originalFilename, secret } = request;
    const context = { correlationId };

    const found = await findAnonymousAuthor(this.authors, secret, context);
    if (!(found instanceof AnonymousAuthorLoadedResponse)) {
      return found instanceof MediaUnavailableResponse
        ? found
        : new MediaUnavailableResponse(
            correlationId,
            "no anonymous author for that secret",
          );
    }

    const owner = { kind: "anonymous" as const, anonymousAuthorId: found.author.id };
    const path = mediaStoragePath(owner, mediaId, originalFilename);

    const downloaded = await this.storage.load(
      new DownloadStorageObjectRequest(this.options.quarantineBucket, path, context),
    );
    if (!(downloaded instanceof StorageObjectDownloadedResponse)) {
      return unavailable(correlationId, downloaded, "storage.load");
    }

    const allowlist = await this.siteConfig.load(
      new LoadAttachmentAllowlistRequest(context),
    );
    if (!(allowlist instanceof AttachmentAllowlistLoadedResponse)) {
      return unavailable(correlationId, allowlist, "siteConfig.load");
    }
    const classified = await this.attachments.evaluate(
      new ClassifyAttachmentRequest(
        originalFilename,
        downloaded.bytes,
        allowlist.allowlist,
        context,
      ),
    );
    if (classified instanceof AttachmentRejectedResponse) {
      await this.storage.remove(
        new RemoveStorageObjectRequest(this.options.quarantineBucket, path, context),
      );
      return new MediaRejectedResponse(correlationId, classified.reason);
    }
    if (!(classified instanceof AttachmentClassifiedResponse)) {
      return unavailable(correlationId, classified, "attachments.evaluate");
    }

    // The request-time check only ever saw the browser's own claim about the file's
    // size; only now, with the real bytes downloaded, is there a size worth trusting.
    const cap = await this.siteConfig.load(new LoadAnonymousUploadCapRequest(context));
    if (!(cap instanceof AnonymousUploadCapLoadedResponse)) {
      return unavailable(correlationId, cap, "siteConfig.load");
    }
    const count = await this.mediaAssets.load(
      new CountMediaForAnonymousAuthorRequest(owner.anonymousAuthorId, context),
    );
    if (!(count instanceof MediaCountResponse)) {
      return unavailable(correlationId, count, "mediaAssets.load");
    }
    const evaluated = await this.quotaEngine.evaluate(
      new EvaluateQuotaRequest(
        { kind: "anonymous", cap: cap.cap },
        downloaded.bytes.length,
        { bytesUsed: 0, filesCount: count.count },
        context,
      ),
    );
    if (evaluated instanceof QuotaExceededResponse) {
      await this.storage.remove(
        new RemoveStorageObjectRequest(this.options.quarantineBucket, path, context),
      );
      return new MediaQuotaExceededResponse(
        correlationId,
        evaluated.reason,
        evaluated.limit,
      );
    }
    if (!(evaluated instanceof QuotaAllowedResponse)) {
      return unavailable(correlationId, evaluated, "quotaEngine.evaluate");
    }

    const sha256 = await sha256HexOfBytes(downloaded.bytes);
    const stored = await this.mediaAssets.store(
      new StoreNewMediaAssetRequest(
        {
          id: mediaId,
          owner,
          storagePath: path,
          kind: classified.kind,
          mimeType: classified.mimeType,
          originalFilename,
          bytes: downloaded.bytes.length,
          sha256,
        },
        context,
      ),
    );
    if (!(stored instanceof MediaAssetStoredResponse)) {
      return unavailable(correlationId, stored, "mediaAssets.store");
    }
    return new MediaFinalizedResponse(correlationId, stored.asset);
  }
}
