import type { IAnonymousAuthorAccessor } from "../../../Accessors/AnonymousAuthorAccessor/IAnonymousAuthorAccessor";
import { AnonymousAuthorLoadedResponse } from "../../../Accessors/AnonymousAuthorAccessor/Responses/AnonymousAuthorLoadedResponse";
import type { IHashMatchAccessor } from "../../../Accessors/HashMatchAccessor/IHashMatchAccessor";
import { MatchImageHashRequest } from "../../../Accessors/HashMatchAccessor/Requests/MatchImageHashRequest";
import { HashMatchResultResponse } from "../../../Accessors/HashMatchAccessor/Responses/HashMatchResultResponse";
import type { IImageClassifierAccessor } from "../../../Accessors/ImageClassifierAccessor/IImageClassifierAccessor";
import { ClassifyImageRequest } from "../../../Accessors/ImageClassifierAccessor/Requests/ClassifyImageRequest";
import { ImageClassifiedResponse } from "../../../Accessors/ImageClassifierAccessor/Responses/ImageClassifiedResponse";
import type { IMediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/IMediaAssetAccessor";
import type { MediaAuditEvent } from "../../../Accessors/MediaAssetAccessor/MediaAuditEvent";
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
import { LoadModerationThresholdsRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadModerationThresholdsRequest";
import { LoadRawIpRetentionDaysRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadRawIpRetentionDaysRequest";
import { AnonymousUploadCapLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/AnonymousUploadCapLoadedResponse";
import { AttachmentAllowlistLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/AttachmentAllowlistLoadedResponse";
import { ModerationThresholdsLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/ModerationThresholdsLoadedResponse";
import { RawIpRetentionDaysLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/RawIpRetentionDaysLoadedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { ImageClassification } from "../../../Common/ImageClassification";
import { LOCKED_RETENTION_DAYS } from "../../../Common/Retention";
import type { ScanStatus } from "../../../Common/ScanStatus";
import { hashIp } from "../../../Utilities/anonymous/hashIp";
import type { IAttachmentEngine } from "../../../Engines/AttachmentEngine/IAttachmentEngine";
import { ClassifyAttachmentRequest } from "../../../Engines/AttachmentEngine/Requests/ClassifyAttachmentRequest";
import { AttachmentClassifiedResponse } from "../../../Engines/AttachmentEngine/Responses/AttachmentClassifiedResponse";
import { AttachmentRejectedResponse } from "../../../Engines/AttachmentEngine/Responses/AttachmentRejectedResponse";
import type { IModerationPolicyEngine } from "../../../Engines/ModerationPolicyEngine/IModerationPolicyEngine";
import { EvaluateModerationRequest } from "../../../Engines/ModerationPolicyEngine/Requests/EvaluateModerationRequest";
import { ContentClearResponse } from "../../../Engines/ModerationPolicyEngine/Responses/ContentClearResponse";
import { ContentFlaggedResponse } from "../../../Engines/ModerationPolicyEngine/Responses/ContentFlaggedResponse";
import { ContentLockedResponse } from "../../../Engines/ModerationPolicyEngine/Responses/ContentLockedResponse";
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

    const verdict = await this.scan(
      classified.kind === "image",
      downloaded.bytes,
      classified.mimeType,
      sha256,
      request.timestamp,
      context,
    );
    if (!("scanStatus" in verdict)) {
      return verdict;
    }

    const retentionDays = await this.siteConfig.load(
      new LoadRawIpRetentionDaysRequest(context),
    );
    if (!(retentionDays instanceof RawIpRetentionDaysLoadedResponse)) {
      return unavailable(correlationId, retentionDays, "siteConfig.load");
    }
    const ipHash = await hashIp(this.options.ipHashSalt, clientIp);

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
          sourceIp: clientIp,
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
    return new MediaFinalizedResponse(correlationId, stored.asset);
  }

  private async scan(
    isImage: boolean,
    bytes: Uint8Array,
    mimeType: string,
    sha256: string,
    timestamp: Date,
    context: { correlationId: string },
  ): Promise<
    | {
        scanStatus: Exclude<ScanStatus, "pending">;
        retainUntil: Date | null;
        auditEvent: MediaAuditEvent | undefined;
      }
    | Result
  > {
    let hashMatched = false;
    let imageClassification: ImageClassification | undefined;

    if (isImage) {
      const hashResult = await this.hashMatch.load(
        new MatchImageHashRequest(bytes, sha256, context),
      );
      if (!(hashResult instanceof HashMatchResultResponse)) {
        return unavailable(context.correlationId, hashResult, "hashMatch.load");
      }
      hashMatched = hashResult.matched;

      const classifyResult = await this.imageClassifier.load(
        new ClassifyImageRequest(bytes, mimeType, context),
      );
      if (!(classifyResult instanceof ImageClassifiedResponse)) {
        return unavailable(context.correlationId, classifyResult, "imageClassifier.load");
      }
      imageClassification = classifyResult.classification;
    }

    const thresholds = await this.siteConfig.load(
      new LoadModerationThresholdsRequest(context),
    );
    if (!(thresholds instanceof ModerationThresholdsLoadedResponse)) {
      return unavailable(context.correlationId, thresholds, "siteConfig.load");
    }

    const verdict = await this.moderationPolicy.evaluate(
      new EvaluateModerationRequest(
        hashMatched,
        imageClassification,
        thresholds.thresholds,
        context,
      ),
    );
    if (verdict instanceof ContentLockedResponse) {
      return {
        scanStatus: "locked",
        retainUntil: new Date(timestamp.getTime() + LOCKED_RETENTION_DAYS * MS_PER_DAY),
        auditEvent: { event: "media.locked", details: { reason: verdict.reason } },
      };
    }
    if (verdict instanceof ContentFlaggedResponse) {
      return { scanStatus: "flagged", retainUntil: null, auditEvent: undefined };
    }
    if (verdict instanceof ContentClearResponse) {
      return { scanStatus: "clear", retainUntil: null, auditEvent: undefined };
    }
    return unavailable(context.correlationId, verdict, "moderationPolicy.evaluate");
  }
}
