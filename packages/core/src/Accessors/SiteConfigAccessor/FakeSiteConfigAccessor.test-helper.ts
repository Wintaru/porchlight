import { HandlerResolverBuilder } from "../../Common/HandlerResolverBuilder";
import { FakeSiteConfigState } from "./FakeSiteConfigState";
import { FakeLoadAnonymousUploadCapHandler } from "./Handlers/FakeLoadAnonymousUploadCapHandler";
import { FakeLoadAttachmentAllowlistHandler } from "./Handlers/FakeLoadAttachmentAllowlistHandler";
import { FakeLoadAttachmentQuotaByTrustHandler } from "./Handlers/FakeLoadAttachmentQuotaByTrustHandler";
import { FakeLoadAutoPromoteAfterApprovedPostsHandler } from "./Handlers/FakeLoadAutoPromoteAfterApprovedPostsHandler";
import { FakeLoadCommentPolicyHandler } from "./Handlers/FakeLoadCommentPolicyHandler";
import { FakeLoadModerationThresholdsHandler } from "./Handlers/FakeLoadModerationThresholdsHandler";
import { FakeLoadPostingPolicyHandler } from "./Handlers/FakeLoadPostingPolicyHandler";
import { FakeLoadRawIpRetentionDaysHandler } from "./Handlers/FakeLoadRawIpRetentionDaysHandler";
import { FakeLoadRegionHandler } from "./Handlers/FakeLoadRegionHandler";
import { FakeLoadSignUpPolicyHandler } from "./Handlers/FakeLoadSignUpPolicyHandler";
import { FakeLoadSiteIdentityHandler } from "./Handlers/FakeLoadSiteIdentityHandler";
import { FakeStoreSiteConfigEntriesHandler } from "./Handlers/FakeStoreSiteConfigEntriesHandler";
import type { ISiteConfigAccessor } from "./ISiteConfigAccessor";
import { LoadAnonymousUploadCapRequest } from "./Requests/LoadAnonymousUploadCapRequest";
import { LoadAttachmentAllowlistRequest } from "./Requests/LoadAttachmentAllowlistRequest";
import { LoadAttachmentQuotaByTrustRequest } from "./Requests/LoadAttachmentQuotaByTrustRequest";
import { LoadAutoPromoteAfterApprovedPostsRequest } from "./Requests/LoadAutoPromoteAfterApprovedPostsRequest";
import { LoadCommentPolicyRequest } from "./Requests/LoadCommentPolicyRequest";
import { LoadModerationThresholdsRequest } from "./Requests/LoadModerationThresholdsRequest";
import { LoadPostingPolicyRequest } from "./Requests/LoadPostingPolicyRequest";
import { LoadRawIpRetentionDaysRequest } from "./Requests/LoadRawIpRetentionDaysRequest";
import { LoadRegionRequest } from "./Requests/LoadRegionRequest";
import { LoadSignUpPolicyRequest } from "./Requests/LoadSignUpPolicyRequest";
import { LoadSiteIdentityRequest } from "./Requests/LoadSiteIdentityRequest";
import { StoreSiteConfigEntriesRequest } from "./Requests/StoreSiteConfigEntriesRequest";
import { SiteConfigAccessor } from "./SiteConfigAccessor";

// Every key GetSiteConfigHandler and SaveSiteConfigHandler touch, wired to one shared
// FakeSiteConfigState — the test-only equivalent of createSiteConfigAccessor's fake
// branch, for tests that exercise the whole accessor rather than one key at a time.
export function fakeSiteConfigAccessor(state: FakeSiteConfigState): ISiteConfigAccessor {
  return new SiteConfigAccessor(
    new HandlerResolverBuilder()
      .register(
        StoreSiteConfigEntriesRequest,
        new FakeStoreSiteConfigEntriesHandler(state),
      )
      .build(),
    new HandlerResolverBuilder()
      .register(LoadPostingPolicyRequest, new FakeLoadPostingPolicyHandler(state))
      .register(LoadCommentPolicyRequest, new FakeLoadCommentPolicyHandler(state))
      .register(LoadSignUpPolicyRequest, new FakeLoadSignUpPolicyHandler(state))
      .register(LoadRegionRequest, new FakeLoadRegionHandler(state))
      .register(LoadSiteIdentityRequest, new FakeLoadSiteIdentityHandler(state))
      .register(
        LoadAttachmentAllowlistRequest,
        new FakeLoadAttachmentAllowlistHandler(state),
      )
      .register(
        LoadAnonymousUploadCapRequest,
        new FakeLoadAnonymousUploadCapHandler(state),
      )
      .register(
        LoadAttachmentQuotaByTrustRequest,
        new FakeLoadAttachmentQuotaByTrustHandler(state),
      )
      .register(
        LoadModerationThresholdsRequest,
        new FakeLoadModerationThresholdsHandler(state),
      )
      .register(
        LoadRawIpRetentionDaysRequest,
        new FakeLoadRawIpRetentionDaysHandler(state),
      )
      .register(
        LoadAutoPromoteAfterApprovedPostsRequest,
        new FakeLoadAutoPromoteAfterApprovedPostsHandler(state),
      )
      .build(),
  );
}

export { FakeSiteConfigState };
