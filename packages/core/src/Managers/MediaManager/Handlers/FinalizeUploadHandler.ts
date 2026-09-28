import type { IHashMatchAccessor } from "../../../Accessors/HashMatchAccessor/IHashMatchAccessor";
import type { IImageClassifierAccessor } from "../../../Accessors/ImageClassifierAccessor/IImageClassifierAccessor";
import type { IMediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/IMediaAssetAccessor";
import { StoreNewMediaAssetRequest } from "../../../Accessors/MediaAssetAccessor/Requests/StoreNewMediaAssetRequest";
import { MediaAssetStoredResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaAssetStoredResponse";
import type { IMediaStorageAccessor } from "../../../Accessors/MediaStorageAccessor/IMediaStorageAccessor";
import { DownloadStorageObjectRequest } from "../../../Accessors/MediaStorageAccessor/Requests/DownloadStorageObjectRequest";
import { LoadStorageObjectInfoRequest } from "../../../Accessors/MediaStorageAccessor/Requests/LoadStorageObjectInfoRequest";
import { RemoveStorageObjectRequest } from "../../../Accessors/MediaStorageAccessor/Requests/RemoveStorageObjectRequest";
import { StorageObjectDownloadedResponse } from "../../../Accessors/MediaStorageAccessor/Responses/StorageObjectDownloadedResponse";
import { StorageObjectInfoResponse } from "../../../Accessors/MediaStorageAccessor/Responses/StorageObjectInfoResponse";
import type { IQuotaAccessor } from "../../../Accessors/QuotaAccessor/IQuotaAccessor";
import { AdjustQuotaUsageRequest } from "../../../Accessors/QuotaAccessor/Requests/AdjustQuotaUsageRequest";
import { LoadQuotaUsageRequest } from "../../../Accessors/QuotaAccessor/Requests/LoadQuotaUsageRequest";
import { QuotaUsageLoadedResponse } from "../../../Accessors/QuotaAccessor/Responses/QuotaUsageLoadedResponse";
import { QuotaUsageStoredResponse } from "../../../Accessors/QuotaAccessor/Responses/QuotaUsageStoredResponse";
import type { ISiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/ISiteConfigAccessor";
import { LoadAttachmentAllowlistRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadAttachmentAllowlistRequest";
import { LoadAttachmentQuotaByTrustRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadAttachmentQuotaByTrustRequest";
import { LoadRawIpRetentionDaysRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadRawIpRetentionDaysRequest";
import { AttachmentAllowlistLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/AttachmentAllowlistLoadedResponse";
import { AttachmentQuotaByTrustLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/AttachmentQuotaByTrustLoadedResponse";
import { RawIpRetentionDaysLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/RawIpRetentionDaysLoadedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { MediaKind } from "../../../Common/MediaKind";
import type { Profile } from "../../../Common/Profile";
import { extensionOf } from "../../../Common/FileExtension";
import { hashIp } from "../../../Utilities/anonymous/hashIp";
import { parseClientAddress } from "../../../Utilities/anonymous/parseClientAddress";
import type { IAttachmentEngine } from "../../../Engines/AttachmentEngine/IAttachmentEngine";
import { ClassifyAttachmentRequest } from "../../../Engines/AttachmentEngine/Requests/ClassifyAttachmentRequest";
import { AttachmentClassifiedResponse } from "../../../Engines/AttachmentEngine/Responses/AttachmentClassifiedResponse";
import { AttachmentRejectedResponse } from "../../../Engines/AttachmentEngine/Responses/AttachmentRejectedResponse";
import type { IModerationPolicyEngine } from "../../../Engines/ModerationPolicyEngine/IModerationPolicyEngine";
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
import { claimedKindOf } from "../claimedKindOf";
import { inspectVideoUpload, sealVideoUpload } from "../readVideoUpload";
import { type ScanSubject, scanUpload } from "../scanUpload";
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

// What was read back from quarantine and checked, ready to scan. `originalBytes` is the
// whole file where it was read whole, so the publish step need not read it again.
interface ReadUpload {
  readonly classified: AttachmentClassifiedResponse;
  readonly bytes: number;
  readonly sha256: string;
  readonly subject: ScanSubject;
  readonly originalBytes: Uint8Array | undefined;
}

type ReadRefusal =
  MediaRejectedResponse | MediaQuotaExceededResponse | MediaUnavailableResponse;

// Confirms a member's own upload (SPEC.md §6): recompute the storage path from the
// actor's own identity (never trust the client's), read back the object that is
// actually sitting there, sniff it, re-check the quota against its REAL size (the
// request-time check only ever saw what the browser claimed the file would be), run it
// through #10's scan pipeline, and only then write the row, its evidence envelope and
// (for a locked verdict) the escalation record — all in one transaction. There is no
// "pending, not yet confirmed" row for this table to carry. A video is read in parts
// rather than whole (#21, readVideoUpload.ts).
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
    if (actor.kind === "visitor") {
      // The rule above already refused a visitor; this narrows the type for the owner.
      // An agent uploads as its member (#31): the member owns the file and its quota.
      return new MediaUnavailableResponse(
        correlationId,
        "media.upload granted to a visitor",
      );
    }

    const owner = { kind: "member" as const, profileId: actor.profile.id };
    const path = mediaStoragePath(owner, mediaId, originalFilename);
    const where = {
      storage: this.storage,
      attachments: this.attachments,
      bucket: this.options.quarantineBucket,
      path,
    };

    const allowlist = await this.siteConfig.load(
      new LoadAttachmentAllowlistRequest(context),
    );
    if (!(allowlist instanceof AttachmentAllowlistLoadedResponse)) {
      return unavailable(correlationId, allowlist, "siteConfig.load");
    }

    // A video is checked in parts and scanned by link (#21); every other file is read
    // whole, as before.
    const claimed = extensionOf(originalFilename);
    const read =
      claimed !== undefined && claimedKindOf(claimed) === "video"
        ? await this.readVideo(where, actor.profile, originalFilename, allowlist, context)
        : await this.readFile(where, actor.profile, originalFilename, allowlist, context);
    if (!("sha256" in read)) {
      if (
        read instanceof MediaRejectedResponse ||
        read instanceof MediaQuotaExceededResponse
      ) {
        // Best-effort: quarantine still gets swept by retention regardless, so a failure
        // here does not need to fail the rejection itself.
        await this.storage.remove(
          new RemoveStorageObjectRequest(this.options.quarantineBucket, path, context),
        );
      }
      return read;
    }
    const { classified, bytes, sha256, subject, originalBytes } = read;

    const verdict = await scanUpload(
      {
        hashMatch: this.hashMatch,
        imageClassifier: this.imageClassifier,
        siteConfig: this.siteConfig,
        moderationPolicy: this.moderationPolicy,
      },
      subject,
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
    // A video the browser converted (#21): the file it came from is on the evidence,
    // as the browser reported it. The converted file is the one that was checked. No
    // other kind is converted, so no other kind takes the browser's word for its source.
    const source =
      classified.kind === "video" && request.convertedFrom !== null
        ? request.convertedFrom
        : { filename: originalFilename, bytes };

    const stored = await this.mediaAssets.store(
      new StoreNewMediaAssetRequest(
        {
          id: mediaId,
          owner,
          storagePath: path,
          kind: classified.kind,
          mimeType: classified.mimeType,
          originalFilename,
          bytes,
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
          turnstileResult: "not_required",
          originalFilename: source.filename,
          originalBytes: source.bytes,
          sha256,
          perceptualHash: null,
          requestId: correlationId,
          agentTokenId: actor.kind === "agent" ? actor.grant.tokenId : null,
        },
        verdict.auditEvent,
        context,
      ),
    );
    if (!(stored instanceof MediaAssetStoredResponse)) {
      return unavailable(correlationId, stored, "mediaAssets.store");
    }

    const adjusted = await this.quotas.store(
      new AdjustQuotaUsageRequest(actor.profile.id, bytes, 1, context),
    );
    if (!(adjusted instanceof QuotaUsageStoredResponse)) {
      return unavailable(correlationId, adjusted, "quotas.store");
    }

    if (verdict.scanStatus === "locked") {
      return new MediaRefusedResponse(correlationId);
    }
    const { asset, unpublishable } = await publishIfClear(
      this.publisher,
      stored.asset,
      originalBytes,
      {
        correlationId,
        timestamp: request.timestamp,
      },
    );
    return new MediaFinalizedResponse(correlationId, asset, unpublishable);
  }

  // Any file but a video: the whole object, sniffed, sized, hashed. The quota is
  // checked against the stored size before the download: the bucket takes files as
  // large as a video, and the request-time check only saw the browser's own claim.
  private async readFile(
    where: { readonly bucket: string; readonly path: string },
    profile: Profile,
    originalFilename: string,
    allowlist: AttachmentAllowlistLoadedResponse,
    context: { readonly correlationId: string },
  ): Promise<ReadUpload | ReadRefusal> {
    const { correlationId } = context;
    const info = await this.storage.load(
      new LoadStorageObjectInfoRequest(where.bucket, where.path, context),
    );
    if (!(info instanceof StorageObjectInfoResponse)) {
      return unavailable(correlationId, info, "storage.load");
    }
    // The kind the name claims; the sniff below holds the bytes to that same kind.
    const overQuota = await this.checkQuota(
      profile,
      claimedKindOf(extensionOf(originalFilename) ?? ""),
      info.bytes,
      context,
    );
    if (overQuota !== undefined) {
      return overQuota;
    }
    const downloaded = await this.storage.load(
      new DownloadStorageObjectRequest(where.bucket, where.path, context),
    );
    if (!(downloaded instanceof StorageObjectDownloadedResponse)) {
      return unavailable(correlationId, downloaded, "storage.load");
    }
    if (downloaded.bytes.length !== info.bytes) {
      return new MediaUnavailableResponse(
        correlationId,
        `${where.path} changed size while it was checked`,
      );
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
      return new MediaRejectedResponse(correlationId, classified.reason);
    }
    if (!(classified instanceof AttachmentClassifiedResponse)) {
      return unavailable(correlationId, classified, "attachments.evaluate");
    }
    const sha256 = await sha256HexOfBytes(downloaded.bytes);
    return {
      classified,
      bytes: downloaded.bytes.length,
      sha256,
      subject:
        classified.kind === "image"
          ? {
              kind: "image",
              bytes: downloaded.bytes,
              mimeType: classified.mimeType,
              sha256,
            }
          : { kind: "none" },
      originalBytes: downloaded.bytes,
    };
  }

  // A video (#21): header and movie box first, then the quota against the stored size,
  // and only then the streamed hash of the whole file.
  private async readVideo(
    where: Parameters<typeof inspectVideoUpload>[0],
    profile: Profile,
    originalFilename: string,
    allowlist: AttachmentAllowlistLoadedResponse,
    context: { readonly correlationId: string },
  ): Promise<ReadUpload | ReadRefusal> {
    const inspected = await inspectVideoUpload(
      where,
      originalFilename,
      allowlist.allowlist,
      context,
    );
    if (!("classified" in inspected)) {
      return inspected;
    }
    const overQuota = await this.checkQuota(
      profile,
      inspected.classified.kind,
      inspected.bytes,
      context,
    );
    if (overQuota !== undefined) {
      return overQuota;
    }
    const sealed = await sealVideoUpload(where.storage, inspected, context);
    if (!("sha256" in sealed)) {
      return sealed;
    }
    return {
      classified: inspected.classified,
      bytes: inspected.bytes,
      sha256: sealed.sha256,
      subject: { kind: "video", url: sealed.scanUrl },
      originalBytes: undefined,
    };
  }

  // An admin has no quota (D16).
  private async checkQuota(
    profile: Profile,
    kind: MediaKind,
    bytes: number,
    context: { readonly correlationId: string },
  ): Promise<MediaQuotaExceededResponse | MediaUnavailableResponse | undefined> {
    if (profile.role === "admin") {
      return undefined;
    }
    const { correlationId } = context;
    const quotaByTrust = await this.siteConfig.load(
      new LoadAttachmentQuotaByTrustRequest(context),
    );
    if (!(quotaByTrust instanceof AttachmentQuotaByTrustLoadedResponse)) {
      return unavailable(correlationId, quotaByTrust, "siteConfig.load");
    }
    const usage = await this.quotas.load(new LoadQuotaUsageRequest(profile.id, context));
    if (!(usage instanceof QuotaUsageLoadedResponse)) {
      return unavailable(correlationId, usage, "quotas.load");
    }
    const evaluated = await this.quotaEngine.evaluate(
      new EvaluateQuotaRequest(
        {
          kind: "member",
          trustLevel: profile.trustLevel,
          quotaByTrust: quotaByTrust.quotaByTrust,
        },
        kind,
        bytes,
        { bytesUsed: usage.bytesUsed, filesCount: usage.filesCount },
        context,
      ),
    );
    if (evaluated instanceof QuotaExceededResponse) {
      return new MediaQuotaExceededResponse(
        correlationId,
        evaluated.reason,
        evaluated.limit,
      );
    }
    if (!(evaluated instanceof QuotaAllowedResponse)) {
      return unavailable(correlationId, evaluated, "quotaEngine.evaluate");
    }
    return undefined;
  }
}
