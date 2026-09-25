import type { IMediaStorageAccessor } from "../../../Accessors/MediaStorageAccessor/IMediaStorageAccessor";
import { CreateSignedUploadUrlRequest } from "../../../Accessors/MediaStorageAccessor/Requests/CreateSignedUploadUrlRequest";
import { SignedUploadUrlCreatedResponse } from "../../../Accessors/MediaStorageAccessor/Responses/SignedUploadUrlCreatedResponse";
import type { IQuotaAccessor } from "../../../Accessors/QuotaAccessor/IQuotaAccessor";
import { LoadQuotaUsageRequest } from "../../../Accessors/QuotaAccessor/Requests/LoadQuotaUsageRequest";
import { QuotaUsageLoadedResponse } from "../../../Accessors/QuotaAccessor/Responses/QuotaUsageLoadedResponse";
import type { ISiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/ISiteConfigAccessor";
import { LoadAttachmentAllowlistRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadAttachmentAllowlistRequest";
import { LoadAttachmentQuotaByTrustRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadAttachmentQuotaByTrustRequest";
import { AttachmentAllowlistLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/AttachmentAllowlistLoadedResponse";
import { AttachmentQuotaByTrustLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/AttachmentQuotaByTrustLoadedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import type { IQuotaEngine } from "../../../Engines/QuotaEngine/IQuotaEngine";
import { EvaluateQuotaRequest } from "../../../Engines/QuotaEngine/Requests/EvaluateQuotaRequest";
import { QuotaAllowedResponse } from "../../../Engines/QuotaEngine/Responses/QuotaAllowedResponse";
import { QuotaExceededResponse } from "../../../Engines/QuotaEngine/Responses/QuotaExceededResponse";
import { extensionOf } from "../../../Utilities/media/extensionOf";
import { mediaStoragePath } from "../mediaStoragePath";
import type { MediaManagerOptions } from "../MediaManagerOptions";
import { permit } from "../permit";
import type { RequestUploadUrlRequest } from "../Requests/RequestUploadUrlRequest";
import type { MediaForbiddenResponse } from "../Responses/MediaForbiddenResponse";
import { MediaQuotaExceededResponse } from "../Responses/MediaQuotaExceededResponse";
import { MediaRejectedResponse } from "../Responses/MediaRejectedResponse";
import { MediaUnavailableResponse } from "../Responses/MediaUnavailableResponse";
import { UploadUrlIssuedResponse } from "../Responses/UploadUrlIssuedResponse";
import { unavailable } from "../unavailable";

type Result =
  | UploadUrlIssuedResponse
  | MediaForbiddenResponse
  | MediaRejectedResponse
  | MediaQuotaExceededResponse
  | MediaUnavailableResponse;

// The permission gate, then the allowlist (on the claimed extension alone — the real
// bytes do not exist yet), then the quota, then a signed URL into quarantine. The
// magic-byte check happens at finalize, once there is something to sniff (SPEC.md §6).
export class RequestUploadUrlHandler implements IHandler<
  RequestUploadUrlRequest,
  Result
> {
  constructor(
    private readonly storage: IMediaStorageAccessor,
    private readonly quotas: IQuotaAccessor,
    private readonly siteConfig: ISiteConfigAccessor,
    private readonly permissions: IPermissionEngine,
    private readonly quotaEngine: IQuotaEngine,
    private readonly options: MediaManagerOptions,
  ) {}

  async handle(request: RequestUploadUrlRequest): Promise<Result> {
    const { correlationId, actor, originalFilename, declaredBytes } = request;
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

    const allowlist = await this.siteConfig.load(
      new LoadAttachmentAllowlistRequest(context),
    );
    if (!(allowlist instanceof AttachmentAllowlistLoadedResponse)) {
      return unavailable(correlationId, allowlist, "siteConfig.load");
    }
    const extension = extensionOf(originalFilename);
    if (extension === undefined || !allowlist.allowlist.includes(extension)) {
      return new MediaRejectedResponse(correlationId, "extension-not-allowed");
    }

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
        declaredBytes,
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

    const mediaId = globalThis.crypto.randomUUID();
    const path = mediaStoragePath(
      { kind: "member", profileId: actor.profile.id },
      mediaId,
      originalFilename,
    );
    const signed = await this.storage.store(
      new CreateSignedUploadUrlRequest(this.options.quarantineBucket, path, context),
    );
    if (!(signed instanceof SignedUploadUrlCreatedResponse)) {
      return unavailable(correlationId, signed, "storage.store");
    }
    return new UploadUrlIssuedResponse(correlationId, mediaId, path, signed.signedUrl);
  }
}
