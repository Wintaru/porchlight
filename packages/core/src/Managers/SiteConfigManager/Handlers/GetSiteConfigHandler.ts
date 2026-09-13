import type { ISiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/ISiteConfigAccessor";
import { LoadAnonymousUploadCapRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadAnonymousUploadCapRequest";
import { LoadAttachmentAllowlistRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadAttachmentAllowlistRequest";
import { LoadAttachmentQuotaByTrustRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadAttachmentQuotaByTrustRequest";
import { LoadAutoPromoteAfterApprovedPostsRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadAutoPromoteAfterApprovedPostsRequest";
import { LoadCommentPolicyRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadCommentPolicyRequest";
import { LoadModerationThresholdsRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadModerationThresholdsRequest";
import { LoadPostingPolicyRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadPostingPolicyRequest";
import { LoadRawIpRetentionDaysRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadRawIpRetentionDaysRequest";
import { LoadRegionRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadRegionRequest";
import { LoadSignUpPolicyRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadSignUpPolicyRequest";
import { LoadSiteIdentityRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadSiteIdentityRequest";
import { AnonymousUploadCapLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/AnonymousUploadCapLoadedResponse";
import { AttachmentAllowlistLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/AttachmentAllowlistLoadedResponse";
import { AttachmentQuotaByTrustLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/AttachmentQuotaByTrustLoadedResponse";
import { AutoPromoteAfterApprovedPostsLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/AutoPromoteAfterApprovedPostsLoadedResponse";
import { CommentPolicyLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/CommentPolicyLoadedResponse";
import { ModerationThresholdsLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/ModerationThresholdsLoadedResponse";
import { PostingPolicyLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/PostingPolicyLoadedResponse";
import { RawIpRetentionDaysLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/RawIpRetentionDaysLoadedResponse";
import { RegionLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/RegionLoadedResponse";
import { SignUpPolicyLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/SignUpPolicyLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/SiteConfigAccessFailedResponse";
import { SiteIdentityLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/SiteIdentityLoadedResponse";
import type { Actor } from "../../../Common/Actor";
import type { DutyChecklistItem } from "../../../Common/DutyChecklistItem";
import type { IHandler } from "../../../Common/IHandler";
import type { RequestContext } from "../../../Common/RequestContext";
import type { ResponseBase } from "../../../Common/ResponseBase";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { EvaluatePermissionRequest } from "../../../Engines/PermissionEngine/Requests/EvaluatePermissionRequest";
import { PermissionDeniedResponse } from "../../../Engines/PermissionEngine/Responses/PermissionDeniedResponse";
import { PermissionUnavailableResponse } from "../../../Engines/PermissionEngine/Responses/PermissionUnavailableResponse";
import { REGION_PROFILES } from "../RegionProfiles";
import type { GetSiteConfigRequest } from "../Requests/GetSiteConfigRequest";
import { SiteConfigForbiddenResponse } from "../Responses/SiteConfigForbiddenResponse";
import { SiteConfigResponse } from "../Responses/SiteConfigResponse";
import { SiteConfigUnavailableResponse } from "../Responses/SiteConfigUnavailableResponse";
import type { SiteConfigSnapshot } from "../SiteConfigSnapshot";

type Verdict =
  SiteConfigResponse | SiteConfigForbiddenResponse | SiteConfigUnavailableResponse;

// The whole admin settings page in one call: every `site_config` value, the wired
// region profile, and the duty checklist (SPEC.md §4, §7). Admin-only.
export class GetSiteConfigHandler implements IHandler<GetSiteConfigRequest, Verdict> {
  constructor(
    private readonly siteConfig: ISiteConfigAccessor,
    private readonly permissions: IPermissionEngine,
    private readonly dutyChecklist: readonly DutyChecklistItem[],
  ) {}

  async handle(request: GetSiteConfigRequest): Promise<Verdict> {
    const { correlationId, actor } = request;
    const allowed = await this.mayManage(actor, { correlationId });
    if (allowed !== undefined) {
      return allowed;
    }

    const context: RequestContext = { correlationId };
    const [
      posting,
      comments,
      signUp,
      region,
      siteIdentity,
      attachmentAllowlist,
      anonymousUploadCap,
      attachmentQuotaByTrust,
      moderationThresholds,
      rawIpRetentionDays,
      autoPromoteAfterApprovedPosts,
    ] = await Promise.all([
      this.siteConfig.load(new LoadPostingPolicyRequest(context)),
      this.siteConfig.load(new LoadCommentPolicyRequest(context)),
      this.siteConfig.load(new LoadSignUpPolicyRequest(context)),
      this.siteConfig.load(new LoadRegionRequest(context)),
      this.siteConfig.load(new LoadSiteIdentityRequest(context)),
      this.siteConfig.load(new LoadAttachmentAllowlistRequest(context)),
      this.siteConfig.load(new LoadAnonymousUploadCapRequest(context)),
      this.siteConfig.load(new LoadAttachmentQuotaByTrustRequest(context)),
      this.siteConfig.load(new LoadModerationThresholdsRequest(context)),
      this.siteConfig.load(new LoadRawIpRetentionDaysRequest(context)),
      this.siteConfig.load(new LoadAutoPromoteAfterApprovedPostsRequest(context)),
    ]);

    if (!(posting instanceof PostingPolicyLoadedResponse)) {
      return unavailable(correlationId, posting);
    }
    if (!(comments instanceof CommentPolicyLoadedResponse)) {
      return unavailable(correlationId, comments);
    }
    if (!(signUp instanceof SignUpPolicyLoadedResponse)) {
      return unavailable(correlationId, signUp);
    }
    if (!(region instanceof RegionLoadedResponse)) {
      return unavailable(correlationId, region);
    }
    if (!(siteIdentity instanceof SiteIdentityLoadedResponse)) {
      return unavailable(correlationId, siteIdentity);
    }
    if (!(attachmentAllowlist instanceof AttachmentAllowlistLoadedResponse)) {
      return unavailable(correlationId, attachmentAllowlist);
    }
    if (!(anonymousUploadCap instanceof AnonymousUploadCapLoadedResponse)) {
      return unavailable(correlationId, anonymousUploadCap);
    }
    if (!(attachmentQuotaByTrust instanceof AttachmentQuotaByTrustLoadedResponse)) {
      return unavailable(correlationId, attachmentQuotaByTrust);
    }
    if (!(moderationThresholds instanceof ModerationThresholdsLoadedResponse)) {
      return unavailable(correlationId, moderationThresholds);
    }
    if (!(rawIpRetentionDays instanceof RawIpRetentionDaysLoadedResponse)) {
      return unavailable(correlationId, rawIpRetentionDays);
    }
    if (
      !(
        autoPromoteAfterApprovedPosts instanceof
        AutoPromoteAfterApprovedPostsLoadedResponse
      )
    ) {
      return unavailable(correlationId, autoPromoteAfterApprovedPosts);
    }

    const config: SiteConfigSnapshot = {
      posting: posting.policy,
      comments: comments.policy,
      signUp: signUp.policy,
      region: region.region,
      siteIdentity: siteIdentity.identity,
      attachmentAllowlist: attachmentAllowlist.allowlist,
      anonymousUploadCap: anonymousUploadCap.cap,
      attachmentQuotaByTrust: attachmentQuotaByTrust.quotaByTrust,
      moderationThresholds: moderationThresholds.thresholds,
      rawIpRetentionDays: rawIpRetentionDays.days,
      autoPromoteAfterApprovedPosts: autoPromoteAfterApprovedPosts.afterApprovedPosts,
    };
    return new SiteConfigResponse(
      correlationId,
      config,
      REGION_PROFILES[config.region],
      this.dutyChecklist,
    );
  }

  private async mayManage(
    actor: Actor,
    context: RequestContext,
  ): Promise<SiteConfigForbiddenResponse | SiteConfigUnavailableResponse | undefined> {
    const verdict = await this.permissions.evaluate(
      new EvaluatePermissionRequest(
        actor,
        "site_config.manage",
        { kind: "site" },
        context,
      ),
    );
    if (verdict instanceof PermissionDeniedResponse) {
      return new SiteConfigForbiddenResponse(verdict.correlationId, verdict.reason);
    }
    if (verdict instanceof PermissionUnavailableResponse) {
      return new SiteConfigUnavailableResponse(verdict.correlationId, verdict.reason);
    }
    return undefined;
  }
}

function unavailable(
  correlationId: string,
  response: ResponseBase,
): SiteConfigUnavailableResponse {
  const reason =
    response instanceof SiteConfigAccessFailedResponse
      ? response.reason
      : `unexpected ${response.constructor.name} from load`;
  return new SiteConfigUnavailableResponse(correlationId, reason);
}
