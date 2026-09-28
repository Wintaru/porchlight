import type { IAnonymousAuthorAccessor } from "../../../Accessors/AnonymousAuthorAccessor/IAnonymousAuthorAccessor";
import { AnonymousAuthorLoadedResponse } from "../../../Accessors/AnonymousAuthorAccessor/Responses/AnonymousAuthorLoadedResponse";
import type { IHashMatchAccessor } from "../../../Accessors/HashMatchAccessor/IHashMatchAccessor";
import type { IImageClassifierAccessor } from "../../../Accessors/ImageClassifierAccessor/IImageClassifierAccessor";
import type { IMediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/IMediaAssetAccessor";
import { CountMediaForAnonymousAuthorRequest } from "../../../Accessors/MediaAssetAccessor/Requests/CountMediaForAnonymousAuthorRequest";
import { StoreNewMediaAssetRequest } from "../../../Accessors/MediaAssetAccessor/Requests/StoreNewMediaAssetRequest";
import { MediaAssetStoredResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetStoredResponse";
import { MediaCountResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaCountResponse";
import type { IMediaStorageAccessor } from "../../../Accessors/MediaStorageAccessor/IMediaStorageAccessor";
import { DownloadStorageObjectRequest } from "../../../Accessors/MediaStorageAccessor/Requests/DownloadStorageObjectRequest";
import { LoadStorageObjectInfoRequest } from "../../../Accessors/MediaStorageAccessor/Requests/LoadStorageObjectInfoRequest";
import { RemoveStorageObjectRequest } from "../../../Accessors/MediaStorageAccessor/Requests/RemoveStorageObjectRequest";
import { StorageObjectDownloadedResponse } from "../../../Accessors/MediaStorageAccessor/Responses/StorageObjectDownloadedResponse";
import { StorageObjectInfoResponse } from "../../../Accessors/MediaStorageAccessor/Responses/StorageObjectInfoResponse";
import type { ISiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/ISiteConfigAccessor";
import { LoadAnonymousUploadCapRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadAnonymousUploadCapRequest";
import { LoadAttachmentAllowlistRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadAttachmentAllowlistRequest";
import { LoadRawIpRetentionDaysRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadRawIpRetentionDaysRequest";
import { AnonymousUploadCapLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/AnonymousUploadCapLoadedResponse";
import { AttachmentAllowlistLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/AttachmentAllowlistLoadedResponse";
import { RawIpRetentionDaysLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/RawIpRetentionDaysLoadedResponse";
import type { IHandler } from "../../../Common/IHandler";
import { hashIp } from "../../../Utilities/anonymous/hashIp";
import { parseClientAddress } from "../../../Utilities/anonymous/parseClientAddress";
import type { IAttachmentEngine } from "../../../Engines/AttachmentEngine/IAttachmentEngine";
import { ClassifyAttachmentRequest } from "../../../Engines/AttachmentEngine/Requests/ClassifyAttachmentRequest";
import { AttachmentClassifiedResponse } from "../../../Engines/AttachmentEngine/Responses/AttachmentClassifiedResponse";
import { AttachmentRejectedResponse } from "../../../Engines/AttachmentEngine/Responses/AttachmentRejectedResponse";
import type { IModerationPolicyEngine } from "../../../Engines/ModerationPolicyEngine/IModerationPolicyEngine";
import type { IMediaPublishEngine } from "../../../Engines/MediaPublishEngine/IMediaPublishEngine";
import type { IQuotaEngine } from "../../../Engines/QuotaEngine/IQuotaEngine";
import { EvaluateQuotaRequest } from "../../../Engines/QuotaEngine/Requests/EvaluateQuotaRequest";
import { QuotaAllowedResponse } from "../../../Engines/QuotaEngine/Responses/QuotaAllowedResponse";
import { QuotaExceededResponse } from "../../../Engines/QuotaEngine/Responses/QuotaExceededResponse";
import { extensionOf } from "../../../Common/FileExtension";
import { sha256HexOfBytes } from "../../../Utilities/media/sha256HexOfBytes";
import { claimedKindOf } from "../claimedKindOf";
import { findAnonymousAuthor } from "../findAnonymousAuthor";
import { mediaStoragePath } from "../mediaStoragePath";
import type { MediaManagerOptions } from "../MediaManagerOptions";
import { publishIfClear } from "../publishIfClear";
import { scanUpload } from "../scanUpload";
import type { FinalizeUploadAnonymouslyRequest } from "../Requests/FinalizeUploadAnonymouslyRequest";
import { MediaFinalizedResponse } from "../Responses/MediaFinalizedResponse";
import { MediaQuotaExceededResponse } from "../Responses/MediaQuotaExceededResponse";
import { MediaRefusedResponse } from "../Responses/MediaRefusedResponse";
import { MediaRejectedResponse } from "../Responses/MediaRejectedResponse";
import { MediaUnavailableResponse } from "../Responses/MediaUnavailableResponse";
import { unavailable } from "../unavailable";

type Result =
  | MediaFinalizedResponse
  | MediaRejectedResponse
  | MediaQuotaExceededResponse
  | MediaRefusedResponse
  | MediaUnavailableResponse;

const MS_PER_DAY = 86_400_000;

// Confirms a visitor's own upload, the anonymous mirror of FinalizeUploadHandler: no
// actor, no permission check — holding the cookie secret is the only proof of ownership
// an anonymous author has, and it is what the storage path is derived from. The scan
// pipeline and the evidence write are identical to the member path (SPEC.md §7):
// scanning has no exception for who is uploading.
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
    private readonly hashMatch: IHashMatchAccessor,
    private readonly imageClassifier: IImageClassifierAccessor,
    private readonly moderationPolicy: IModerationPolicyEngine,
    private readonly quotaEngine: IQuotaEngine,
    private readonly publisher: IMediaPublishEngine,
    private readonly options: MediaManagerOptions,
  ) {}

  async handle(request: FinalizeUploadAnonymouslyRequest): Promise<Result> {
    const { correlationId, mediaId, originalFilename, secret, clientIp, userAgent } =
      request;
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

    const info = await this.storage.load(
      new LoadStorageObjectInfoRequest(this.options.quarantineBucket, path, context),
    );
    if (!(info instanceof StorageObjectInfoResponse)) {
      return unavailable(correlationId, info, "storage.load");
    }

    // The request-time check only ever saw the browser's own claim about the file's
    // size. The stored size is checked before the download: the bucket takes files as
    // large as a video. The kind is the one the name claims; the sniff below holds the
    // bytes to that same kind.
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
        claimedKindOf(extensionOf(originalFilename) ?? ""),
        info.bytes,
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

    const downloaded = await this.storage.load(
      new DownloadStorageObjectRequest(this.options.quarantineBucket, path, context),
    );
    if (!(downloaded instanceof StorageObjectDownloadedResponse)) {
      return unavailable(correlationId, downloaded, "storage.load");
    }
    if (downloaded.bytes.length !== info.bytes) {
      return new MediaUnavailableResponse(
        correlationId,
        `${path} changed size while it was checked`,
      );
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

    const sha256 = await sha256HexOfBytes(downloaded.bytes);

    const verdict = await scanUpload(
      {
        hashMatch: this.hashMatch,
        imageClassifier: this.imageClassifier,
        siteConfig: this.siteConfig,
        moderationPolicy: this.moderationPolicy,
      },
      classified.kind === "image"
        ? {
            kind: "image",
            bytes: downloaded.bytes,
            mimeType: classified.mimeType,
            sha256,
          }
        : { kind: "none" },
      request.timestamp,
      context,
    );
    if (verdict instanceof MediaRejectedResponse) {
      await this.storage.remove(
        new RemoveStorageObjectRequest(this.options.quarantineBucket, path, context),
      );
      return verdict;
    }
    if (!("scanStatus" in verdict)) {
      return verdict;
    }

    const retentionDays = await this.siteConfig.load(
      new LoadRawIpRetentionDaysRequest(context),
    );
    if (!(retentionDays instanceof RawIpRetentionDaysLoadedResponse)) {
      return unavailable(correlationId, retentionDays, "siteConfig.load");
    }
    // A proxy may append a port, or send text that is no address at all (#64).
    const address = parseClientAddress(clientIp);
    const ipHash = await hashIp(this.options.ipHashSalt, address.ip ?? clientIp);

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
          scanStatus: verdict.scanStatus,
          retainUntil: verdict.retainUntil,
        },
        {
          sourceIp: address.ip,
          sourcePort: address.port,
          ipHash,
          rawIpExpiresAt: new Date(
            request.timestamp.getTime() + retentionDays.days * MS_PER_DAY,
          ),
          userAgent,
          turnstileResult: "pass",
          originalFilename,
          originalBytes: downloaded.bytes.length,
          sha256,
          perceptualHash: null,
          requestId: correlationId,
          // A visitor at a form, never an agent: a token is always a member's (D22).
          agentTokenId: null,
        },
        verdict.auditEvent,
        context,
      ),
    );
    if (!(stored instanceof MediaAssetStoredResponse)) {
      return unavailable(correlationId, stored, "mediaAssets.store");
    }

    if (verdict.scanStatus === "locked") {
      return new MediaRefusedResponse(correlationId);
    }
    const { asset, unpublishable } = await publishIfClear(
      this.publisher,
      stored.asset,
      { bytes: downloaded.bytes, heicPixels: verdict.heicPixels },
      {
        correlationId,
        timestamp: request.timestamp,
      },
    );
    return new MediaFinalizedResponse(correlationId, asset, unpublishable);
  }
}
