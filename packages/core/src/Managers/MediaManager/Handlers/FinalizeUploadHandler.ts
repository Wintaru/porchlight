import type { IMediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/IMediaAssetAccessor";
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
import { AttachmentAllowlistLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/AttachmentAllowlistLoadedResponse";
import { AttachmentQuotaByTrustLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/AttachmentQuotaByTrustLoadedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IAttachmentEngine } from "../../../Engines/AttachmentEngine/IAttachmentEngine";
import { ClassifyAttachmentRequest } from "../../../Engines/AttachmentEngine/Requests/ClassifyAttachmentRequest";
import { AttachmentClassifiedResponse } from "../../../Engines/AttachmentEngine/Responses/AttachmentClassifiedResponse";
import { AttachmentRejectedResponse } from "../../../Engines/AttachmentEngine/Responses/AttachmentRejectedResponse";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import type { IQuotaEngine } from "../../../Engines/QuotaEngine/IQuotaEngine";
import { EvaluateQuotaRequest } from "../../../Engines/QuotaEngine/Requests/EvaluateQuotaRequest";
import { QuotaAllowedResponse } from "../../../Engines/QuotaEngine/Responses/QuotaAllowedResponse";
import { QuotaExceededResponse } from "../../../Engines/QuotaEngine/Responses/QuotaExceededResponse";
import { sha256HexOfBytes } from "../../../Utilities/media/sha256HexOfBytes";
import { mediaStoragePath } from "../mediaStoragePath";
import type { MediaManagerOptions } from "../MediaManagerOptions";
import { permit } from "../permit";
import type { FinalizeUploadRequest } from "../Requests/FinalizeUploadRequest";
import { MediaFinalizedResponse } from "../Responses/MediaFinalizedResponse";
import type { MediaForbiddenResponse } from "../Responses/MediaForbiddenResponse";
import { MediaQuotaExceededResponse } from "../Responses/MediaQuotaExceededResponse";
import { MediaRejectedResponse } from "../Responses/MediaRejectedResponse";
import { MediaUnavailableResponse } from "../Responses/MediaUnavailableResponse";
import { unavailable } from "../unavailable";

type Result =
  | MediaFinalizedResponse
  | MediaForbiddenResponse
  | MediaRejectedResponse
  | MediaQuotaExceededResponse
  | MediaUnavailableResponse;

// Confirms a member's own upload (SPEC.md §6): recompute the storage path from the
// actor's own identity (never trust the client's), download the object that is
// actually sitting there, sniff it, re-check the quota against its REAL size (the
// request-time check only ever saw what the browser claimed the file would be), and
// only then write the row and count it against quota. A row exists in `media_assets`
// only once every one of those steps has passed — there is no "pending, not yet
// confirmed" row for this table to carry.
export class FinalizeUploadHandler implements IHandler<FinalizeUploadRequest, Result> {
  constructor(
    private readonly storage: IMediaStorageAccessor,
    private readonly mediaAssets: IMediaAssetAccessor,
    private readonly quotas: IQuotaAccessor,
    private readonly siteConfig: ISiteConfigAccessor,
    private readonly permissions: IPermissionEngine,
    private readonly attachments: IAttachmentEngine,
    private readonly quotaEngine: IQuotaEngine,
    private readonly options: MediaManagerOptions,
  ) {}

  async handle(request: FinalizeUploadRequest): Promise<Result> {
    const { correlationId, actor, mediaId, originalFilename } = request;
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

    const adjusted = await this.quotas.store(
      new AdjustQuotaUsageRequest(actor.profile.id, downloaded.bytes.length, 1, context),
    );
    if (!(adjusted instanceof QuotaUsageStoredResponse)) {
      return unavailable(correlationId, adjusted, "quotas.store");
    }

    return new MediaFinalizedResponse(correlationId, stored.asset);
  }
}
