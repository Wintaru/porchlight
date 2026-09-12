import type { IMediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/IMediaAssetAccessor";
import { CountMediaForAnonymousAuthorRequest } from "../../../Accessors/MediaAssetAccessor/Requests/CountMediaForAnonymousAuthorRequest";
import { MediaCountResponse } from "../../../Accessors/MediaAssetAccessor/Responses/MediaCountResponse";
import type { IMediaStorageAccessor } from "../../../Accessors/MediaStorageAccessor/IMediaStorageAccessor";
import { CreateSignedUploadUrlRequest } from "../../../Accessors/MediaStorageAccessor/Requests/CreateSignedUploadUrlRequest";
import { SignedUploadUrlCreatedResponse } from "../../../Accessors/MediaStorageAccessor/Responses/SignedUploadUrlCreatedResponse";
import type { ISiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/ISiteConfigAccessor";
import { LoadAnonymousUploadCapRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadAnonymousUploadCapRequest";
import { LoadAttachmentAllowlistRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadAttachmentAllowlistRequest";
import { AnonymousUploadCapLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/AnonymousUploadCapLoadedResponse";
import { AttachmentAllowlistLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/AttachmentAllowlistLoadedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IAnonymousGuardEngine } from "../../../Engines/AnonymousGuardEngine/IAnonymousGuardEngine";
import { AdmitAnonymousSubmissionRequest } from "../../../Engines/AnonymousGuardEngine/Requests/AdmitAnonymousSubmissionRequest";
import { AnonymousAdmittedResponse } from "../../../Engines/AnonymousGuardEngine/Responses/AnonymousAdmittedResponse";
import { AnonymousGuardDeniedResponse } from "../../../Engines/AnonymousGuardEngine/Responses/AnonymousGuardDeniedResponse";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import type { IQuotaEngine } from "../../../Engines/QuotaEngine/IQuotaEngine";
import { EvaluateQuotaRequest } from "../../../Engines/QuotaEngine/Requests/EvaluateQuotaRequest";
import { QuotaAllowedResponse } from "../../../Engines/QuotaEngine/Responses/QuotaAllowedResponse";
import { QuotaExceededResponse } from "../../../Engines/QuotaEngine/Responses/QuotaExceededResponse";
import { extensionOf } from "../../../Utilities/media/extensionOf";
import { mediaStoragePath } from "../mediaStoragePath";
import type { MediaManagerOptions } from "../MediaManagerOptions";
import { permit } from "../permit";
import type { RequestUploadUrlAnonymouslyRequest } from "../Requests/RequestUploadUrlAnonymouslyRequest";
import { AnonymousUploadUrlIssuedResponse } from "../Responses/AnonymousUploadUrlIssuedResponse";
import type { MediaForbiddenResponse } from "../Responses/MediaForbiddenResponse";
import { MediaGuardRefusedResponse } from "../Responses/MediaGuardRefusedResponse";
import { MediaQuotaExceededResponse } from "../Responses/MediaQuotaExceededResponse";
import { MediaRejectedResponse } from "../Responses/MediaRejectedResponse";
import type { MediaUnavailableResponse } from "../Responses/MediaUnavailableResponse";
import { unavailable } from "../unavailable";

type Result =
  | AnonymousUploadUrlIssuedResponse
  | MediaForbiddenResponse
  | MediaGuardRefusedResponse
  | MediaRejectedResponse
  | MediaQuotaExceededResponse
  | MediaUnavailableResponse;

// The D20 permission gate, then the D15 admission guard (Turnstile, block, rate limit —
// the same sequence a post or comment runs), then the allowlist, then the D15 fixed
// upload cap, then a signed URL into quarantine (SPEC.md §4, §6).
export class RequestUploadUrlAnonymouslyHandler implements IHandler<
  RequestUploadUrlAnonymouslyRequest,
  Result
> {
  constructor(
    private readonly storage: IMediaStorageAccessor,
    private readonly mediaAssets: IMediaAssetAccessor,
    private readonly siteConfig: ISiteConfigAccessor,
    private readonly permissions: IPermissionEngine,
    private readonly guard: IAnonymousGuardEngine,
    private readonly quotaEngine: IQuotaEngine,
    private readonly options: MediaManagerOptions,
  ) {}

  async handle(request: RequestUploadUrlAnonymouslyRequest): Promise<Result> {
    const { correlationId, actor, originalFilename, declaredBytes, submission } = request;
    const context = { correlationId };

    const refused = await permit(
      this.permissions,
      actor,
      "media.upload.anonymous",
      { kind: "site" },
      context,
    );
    if (refused !== undefined) {
      return refused;
    }

    const admitted = await this.guard.evaluate(
      new AdmitAnonymousSubmissionRequest("media", submission, context),
    );
    if (admitted instanceof AnonymousGuardDeniedResponse) {
      return new MediaGuardRefusedResponse(correlationId, admitted.reason);
    }
    if (!(admitted instanceof AnonymousAdmittedResponse)) {
      return unavailable(correlationId, admitted, "guard.evaluate");
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

    const cap = await this.siteConfig.load(new LoadAnonymousUploadCapRequest(context));
    if (!(cap instanceof AnonymousUploadCapLoadedResponse)) {
      return unavailable(correlationId, cap, "siteConfig.load");
    }
    const count = await this.mediaAssets.load(
      new CountMediaForAnonymousAuthorRequest(admitted.author.id, context),
    );
    if (!(count instanceof MediaCountResponse)) {
      return unavailable(correlationId, count, "mediaAssets.load");
    }
    const evaluated = await this.quotaEngine.evaluate(
      new EvaluateQuotaRequest(
        { kind: "anonymous", cap: cap.cap },
        declaredBytes,
        { bytesUsed: 0, filesCount: count.count },
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
      { kind: "anonymous", anonymousAuthorId: admitted.author.id },
      mediaId,
      originalFilename,
    );
    const signed = await this.storage.store(
      new CreateSignedUploadUrlRequest(this.options.quarantineBucket, path, context),
    );
    if (!(signed instanceof SignedUploadUrlCreatedResponse)) {
      return unavailable(correlationId, signed, "storage.store");
    }
    return new AnonymousUploadUrlIssuedResponse(
      correlationId,
      mediaId,
      path,
      signed.signedUrl,
      admitted.secret,
      admitted.isNewAuthor,
    );
  }
}
