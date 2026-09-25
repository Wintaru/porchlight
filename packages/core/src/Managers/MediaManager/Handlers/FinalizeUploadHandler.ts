import type { IHashMatchAccessor } from "../../../Accessors/HashMatchAccessor/IHashMatchAccessor";
import { MatchImageHashRequest } from "../../../Accessors/HashMatchAccessor/Requests/MatchImageHashRequest";
import { HashMatchResultResponse } from "../../../Accessors/HashMatchAccessor/Responses/HashMatchResultResponse";
import type { IImageClassifierAccessor } from "../../../Accessors/ImageClassifierAccessor/IImageClassifierAccessor";
import { ClassifyImageRequest } from "../../../Accessors/ImageClassifierAccessor/Requests/ClassifyImageRequest";
import { ImageClassifiedResponse } from "../../../Accessors/ImageClassifierAccessor/Responses/ImageClassifiedResponse";
import type { IMediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/IMediaAssetAccessor";
import type { MediaAuditEvent } from "../../../Accessors/MediaAssetAccessor/MediaAuditEvent";
import { StoreNewMediaAssetRequest } from "../../../Accessors/MediaAssetAccessor/Requests/StoreNewMediaAssetRequest";
import { MediaAssetStoredResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetStoredResponse";
import type { IMediaStorageAccessor } from "../../../Accessors/MediaStorageAccessor/IMediaStorageAccessor";
import { DownloadStorageObjectRequest } from "../../../Accessors/MediaStorageAccessor/Requests/DownloadStorageObjectRequest";
import { RemoveStorageObjectRequest } from "../../../Accessors/MediaStorageAccessor/Requests/RemoveStorageObjectRequest";
import { StorageObjectDownloadedResponse } from "../../../Accessors/MediaStorageAccessor/Responses/StorageObjectDownloadedResponse";
import type { IQuotaAccessor } from "../../../Accessors/QuotaAccessor/IQuotaAccessor";
import { AdjustQuotaUsageRequest } from "../../../Accessors/QuotaAccessor/Requests/AdjustQuotaUsageRequest";
import { LoadQuotaUsageRequest } from "../../../Accessors/QuotaAccessor/Requests/LoadQuotaUsageRequest";
import { QuotaUsageLoadedResponse } from "../../../Accessors/QuotaAccessor/Responses/QuotaUsageLoadedResponse";
import { QuotaUsageStoredResponse } from "../../../Accessors/QuotaAccessor/Responses/QuotaUsageStoredResponse";
import type { ISiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/ISiteConfigAccessor";
import { LoadAttachmentAllowlistRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadAttachmentAllowlistRequest";
import { LoadAttachmentQuotaByTrustRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadAttachmentQuotaByTrustRequest";
import { LoadModerationThresholdsRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadModerationThresholdsRequest";
import { LoadRawIpRetentionDaysRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadRawIpRetentionDaysRequest";
import { AttachmentAllowlistLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/AttachmentAllowlistLoadedResponse";
import { AttachmentQuotaByTrustLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/AttachmentQuotaByTrustLoadedResponse";
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
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import type { IMediaPublishEngine } from "../../../Engines/MediaPublishEngine/IMediaPublishEngine";
import type { IQuotaEngine } from "../../../Engines/QuotaEngine/IQuotaEngine";
import { EvaluateQuotaRequest } from "../../../Engines/QuotaEngine/Requests/EvaluateQuotaRequest";
import { QuotaAllowedResponse } from "../../../Engines/QuotaEngine/Responses/QuotaAllowedResponse";
import { QuotaExceededResponse } from "../../../Engines/QuotaEngine/Responses/QuotaExceededResponse";
import { sha256HexOfBytes } from "../../../Utilities/media/sha256HexOfBytes";
import { mediaStoragePath } from "../mediaStoragePath";
import type { MediaManagerOptions } from "../MediaManagerOptions";
import { publishIfClear } from "../publishIfClear";
import { permit } from "../permit";
import type { FinalizeUploadRequest } from "../Requests/FinalizeUploadRequest";
import { MediaFinalizedResponse } from "../Responses/MediaFinalizedResponse";
import type { MediaForbiddenResponse } from "../Responses/MediaForbiddenResponse";
import { MediaQuotaExceededResponse } from "../Responses/MediaQuotaExceededResponse";
import { MediaRefusedResponse } from "../Responses/MediaRefusedResponse";
import { MediaRejectedResponse } from "../Responses/MediaRejectedResponse";
import { MediaUnavailableResponse } from "../Responses/MediaUnavailableResponse";
import { unavailable } from "../unavailable";

type Result =
  | MediaFinalizedResponse
  | MediaForbiddenResponse
  | MediaRejectedResponse
  | MediaQuotaExceededResponse
  | MediaRefusedResponse
  | MediaUnavailableResponse;

const MS_PER_DAY = 86_400_000;

// Confirms a member's own upload (SPEC.md §6): recompute the storage path from the
// actor's own identity (never trust the client's), download the object that is
// actually sitting there, sniff it, re-check the quota against its REAL size (the
// request-time check only ever saw what the browser claimed the file would be), run it
// through #10's scan pipeline, and only then write the row, its evidence envelope and
// (for a locked verdict) the escalation record — all in one transaction. There is no
// "pending, not yet confirmed" row for this table to carry.
export class FinalizeUploadHandler implements IHandler<FinalizeUploadRequest, Result> {
  constructor(
    private readonly storage: IMediaStorageAccessor,
    private readonly mediaAssets: IMediaAssetAccessor,
    private readonly quotas: IQuotaAccessor,
    private readonly siteConfig: ISiteConfigAccessor,
    private readonly permissions: IPermissionEngine,
    private readonly attachments: IAttachmentEngine,
    private readonly hashMatch: IHashMatchAccessor,
    private readonly imageClassifier: IImageClassifierAccessor,
    private readonly moderationPolicy: IModerationPolicyEngine,
    private readonly quotaEngine: IQuotaEngine,
    private readonly publisher: IMediaPublishEngine,
    private readonly options: MediaManagerOptions,
  ) {}

  async handle(request: FinalizeUploadRequest): Promise<Result> {
    const { correlationId, actor, mediaId, originalFilename, clientIp, userAgent } =
      request;
    const context = { correlationId };

    const refused = await permit(
      this.permissions,
      actor,
      "media.upload",
      { kind: "site" },
      context,
    );
    if (refused !== undefined) {
      return refused;
    }
    if (actor.kind !== "member") {
      // The rule above already refused a visitor; this narrows the type for the owner.
      return new MediaUnavailableResponse(
        correlationId,
        "media.upload granted to a visitor",
      );
    }

    const owner = { kind: "member" as const, profileId: actor.profile.id };
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
      // Best-effort: quarantine still gets swept by retention regardless, so a failure
      // here does not need to fail the rejection itself.
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
    const quotaByTrust = await this.siteConfig.load(
      new LoadAttachmentQuotaByTrustRequest(context),
    );
    if (!(quotaByTrust instanceof AttachmentQuotaByTrustLoadedResponse)) {
      return unavailable(correlationId, quotaByTrust, "siteConfig.load");
    }
    const usage = await this.quotas.load(
      new LoadQuotaUsageRequest(actor.profile.id, context),
    );
    if (!(usage instanceof QuotaUsageLoadedResponse)) {
      return unavailable(correlationId, usage, "quotas.load");
    }
    const evaluated = await this.quotaEngine.evaluate(
      new EvaluateQuotaRequest(
        {
          kind: "member",
          trustLevel: actor.profile.trustLevel,
          quotaByTrust: quotaByTrust.quotaByTrust,
        },
        downloaded.bytes.length,
        { bytesUsed: usage.bytesUsed, filesCount: usage.filesCount },
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
          turnstileResult: "not_required",
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

    const adjusted = await this.quotas.store(
      new AdjustQuotaUsageRequest(actor.profile.id, downloaded.bytes.length, 1, context),
    );
    if (!(adjusted instanceof QuotaUsageStoredResponse)) {
      return unavailable(correlationId, adjusted, "quotas.store");
    }

    if (verdict.scanStatus === "locked") {
      return new MediaRefusedResponse(correlationId);
    }
    const asset = await publishIfClear(this.publisher, stored.asset, downloaded.bytes, {
      correlationId,
      timestamp: request.timestamp,
    });
    return new MediaFinalizedResponse(correlationId, asset);
  }

  // The fixed order (SPEC.md §7, WAYFINDER D17): hash match, then the purpose-built
  // image classifier. A non-image attachment has nothing visual to score and clears
  // without touching either accessor.
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
