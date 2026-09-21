import type { DbClient } from "@porchlight/db";

import { FakeSiteConfigState } from "../Accessors/SiteConfigAccessor/FakeSiteConfigState";
import { FakeLoadAgentsPolicyHandler } from "../Accessors/SiteConfigAccessor/Handlers/FakeLoadAgentsPolicyHandler";
import { FakeLoadAnonymousUploadCapHandler } from "../Accessors/SiteConfigAccessor/Handlers/FakeLoadAnonymousUploadCapHandler";
import { FakeLoadAttachmentAllowlistHandler } from "../Accessors/SiteConfigAccessor/Handlers/FakeLoadAttachmentAllowlistHandler";
import { FakeLoadAttachmentQuotaByTrustHandler } from "../Accessors/SiteConfigAccessor/Handlers/FakeLoadAttachmentQuotaByTrustHandler";
import { FakeLoadAutoPromoteAfterApprovedPostsHandler } from "../Accessors/SiteConfigAccessor/Handlers/FakeLoadAutoPromoteAfterApprovedPostsHandler";
import { FakeLoadCommentPolicyHandler } from "../Accessors/SiteConfigAccessor/Handlers/FakeLoadCommentPolicyHandler";
import { FakeLoadModerationThresholdsHandler } from "../Accessors/SiteConfigAccessor/Handlers/FakeLoadModerationThresholdsHandler";
import { FakeLoadPostingPolicyHandler } from "../Accessors/SiteConfigAccessor/Handlers/FakeLoadPostingPolicyHandler";
import { FakeLoadRawIpRetentionDaysHandler } from "../Accessors/SiteConfigAccessor/Handlers/FakeLoadRawIpRetentionDaysHandler";
import { FakeLoadRegionHandler } from "../Accessors/SiteConfigAccessor/Handlers/FakeLoadRegionHandler";
import { FakeLoadSignUpPolicyHandler } from "../Accessors/SiteConfigAccessor/Handlers/FakeLoadSignUpPolicyHandler";
import { FakeLoadSiteIdentityHandler } from "../Accessors/SiteConfigAccessor/Handlers/FakeLoadSiteIdentityHandler";
import { FakeStoreSiteConfigEntriesHandler } from "../Accessors/SiteConfigAccessor/Handlers/FakeStoreSiteConfigEntriesHandler";
import { SupabaseLoadAgentsPolicyHandler } from "../Accessors/SiteConfigAccessor/Handlers/SupabaseLoadAgentsPolicyHandler";
import { SupabaseLoadAnonymousUploadCapHandler } from "../Accessors/SiteConfigAccessor/Handlers/SupabaseLoadAnonymousUploadCapHandler";
import { SupabaseLoadAttachmentAllowlistHandler } from "../Accessors/SiteConfigAccessor/Handlers/SupabaseLoadAttachmentAllowlistHandler";
import { SupabaseLoadAttachmentQuotaByTrustHandler } from "../Accessors/SiteConfigAccessor/Handlers/SupabaseLoadAttachmentQuotaByTrustHandler";
import { SupabaseLoadAutoPromoteAfterApprovedPostsHandler } from "../Accessors/SiteConfigAccessor/Handlers/SupabaseLoadAutoPromoteAfterApprovedPostsHandler";
import { SupabaseLoadCommentPolicyHandler } from "../Accessors/SiteConfigAccessor/Handlers/SupabaseLoadCommentPolicyHandler";
import { SupabaseLoadModerationThresholdsHandler } from "../Accessors/SiteConfigAccessor/Handlers/SupabaseLoadModerationThresholdsHandler";
import { SupabaseLoadPostingPolicyHandler } from "../Accessors/SiteConfigAccessor/Handlers/SupabaseLoadPostingPolicyHandler";
import { SupabaseLoadRawIpRetentionDaysHandler } from "../Accessors/SiteConfigAccessor/Handlers/SupabaseLoadRawIpRetentionDaysHandler";
import { SupabaseLoadRegionHandler } from "../Accessors/SiteConfigAccessor/Handlers/SupabaseLoadRegionHandler";
import { SupabaseLoadSignUpPolicyHandler } from "../Accessors/SiteConfigAccessor/Handlers/SupabaseLoadSignUpPolicyHandler";
import { SupabaseLoadSiteIdentityHandler } from "../Accessors/SiteConfigAccessor/Handlers/SupabaseLoadSiteIdentityHandler";
import { SupabaseStoreSiteConfigEntriesHandler } from "../Accessors/SiteConfigAccessor/Handlers/SupabaseStoreSiteConfigEntriesHandler";
import type { ISiteConfigAccessor } from "../Accessors/SiteConfigAccessor/ISiteConfigAccessor";
import { LoadAgentsPolicyRequest } from "../Accessors/SiteConfigAccessor/Requests/LoadAgentsPolicyRequest";
import { LoadAnonymousUploadCapRequest } from "../Accessors/SiteConfigAccessor/Requests/LoadAnonymousUploadCapRequest";
import { LoadAttachmentAllowlistRequest } from "../Accessors/SiteConfigAccessor/Requests/LoadAttachmentAllowlistRequest";
import { LoadAttachmentQuotaByTrustRequest } from "../Accessors/SiteConfigAccessor/Requests/LoadAttachmentQuotaByTrustRequest";
import { LoadAutoPromoteAfterApprovedPostsRequest } from "../Accessors/SiteConfigAccessor/Requests/LoadAutoPromoteAfterApprovedPostsRequest";
import { LoadCommentPolicyRequest } from "../Accessors/SiteConfigAccessor/Requests/LoadCommentPolicyRequest";
import { LoadModerationThresholdsRequest } from "../Accessors/SiteConfigAccessor/Requests/LoadModerationThresholdsRequest";
import { LoadPostingPolicyRequest } from "../Accessors/SiteConfigAccessor/Requests/LoadPostingPolicyRequest";
import { LoadRawIpRetentionDaysRequest } from "../Accessors/SiteConfigAccessor/Requests/LoadRawIpRetentionDaysRequest";
import { LoadRegionRequest } from "../Accessors/SiteConfigAccessor/Requests/LoadRegionRequest";
import { LoadSignUpPolicyRequest } from "../Accessors/SiteConfigAccessor/Requests/LoadSignUpPolicyRequest";
import { LoadSiteIdentityRequest } from "../Accessors/SiteConfigAccessor/Requests/LoadSiteIdentityRequest";
import { StoreSiteConfigEntriesRequest } from "../Accessors/SiteConfigAccessor/Requests/StoreSiteConfigEntriesRequest";
import { SiteConfigAccessor } from "../Accessors/SiteConfigAccessor/SiteConfigAccessor";
import {
  COMMENT_POLICIES,
  type CommentPolicy,
  DEFAULT_COMMENT_POLICY,
} from "../Common/CommentPolicy";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import {
  DEFAULT_POSTING_POLICY,
  POSTING_POLICIES,
  type PostingPolicy,
} from "../Common/PostingPolicy";
import {
  DEFAULT_SIGN_UP_POLICY,
  SIGN_UP_POLICIES,
  type SignUpPolicy,
} from "../Common/SignUpPolicy";
import type { Environment } from "./Environment";
import { readFakeResult, readStoreProvider } from "./readStoreProvider";

function isPostingPolicy(value: string): value is PostingPolicy {
  return POSTING_POLICIES.some((policy) => policy === value);
}

function isCommentPolicy(value: string): value is CommentPolicy {
  return COMMENT_POLICIES.some((policy) => policy === value);
}

function isSignUpPolicy(value: string): value is SignUpPolicy {
  return SIGN_UP_POLICIES.some((policy) => policy === value);
}

// The store behind the D20 site settings and the #12 admin page. The fake reads its
// keys from SITE_CONFIG_FAKE_POSTING, SITE_CONFIG_FAKE_COMMENTS and
// SITE_CONFIG_FAKE_SIGN_UP, so a test or a local run can close posting, comments or
// sign-up without a row.
export function createSiteConfigAccessor(
  env: Environment,
  db: () => DbClient,
): ISiteConfigAccessor {
  switch (readStoreProvider(env, "SITE_CONFIG_PROVIDER")) {
    case "supabase": {
      const client = db();
      return new SiteConfigAccessor(
        new HandlerResolverBuilder()
          .register(
            StoreSiteConfigEntriesRequest,
            new SupabaseStoreSiteConfigEntriesHandler(client),
          )
          .build(),
        new HandlerResolverBuilder()
          .register(
            LoadPostingPolicyRequest,
            new SupabaseLoadPostingPolicyHandler(client),
          )
          .register(
            LoadCommentPolicyRequest,
            new SupabaseLoadCommentPolicyHandler(client),
          )
          .register(
            LoadAttachmentAllowlistRequest,
            new SupabaseLoadAttachmentAllowlistHandler(client),
          )
          .register(
            LoadAnonymousUploadCapRequest,
            new SupabaseLoadAnonymousUploadCapHandler(client),
          )
          .register(
            LoadAttachmentQuotaByTrustRequest,
            new SupabaseLoadAttachmentQuotaByTrustHandler(client),
          )
          .register(
            LoadModerationThresholdsRequest,
            new SupabaseLoadModerationThresholdsHandler(client),
          )
          .register(
            LoadRawIpRetentionDaysRequest,
            new SupabaseLoadRawIpRetentionDaysHandler(client),
          )
          .register(LoadRegionRequest, new SupabaseLoadRegionHandler(client))
          .register(LoadSignUpPolicyRequest, new SupabaseLoadSignUpPolicyHandler(client))
          .register(LoadSiteIdentityRequest, new SupabaseLoadSiteIdentityHandler(client))
          .register(
            LoadAutoPromoteAfterApprovedPostsRequest,
            new SupabaseLoadAutoPromoteAfterApprovedPostsHandler(client),
          )
          .register(LoadAgentsPolicyRequest, new SupabaseLoadAgentsPolicyHandler(client))
          .build(),
      );
    }
    case "fake": {
      const posting = env.SITE_CONFIG_FAKE_POSTING ?? DEFAULT_POSTING_POLICY;
      if (!isPostingPolicy(posting)) {
        throw new Error(
          `SITE_CONFIG_FAKE_POSTING=${posting} is not a posting policy. Known: ${POSTING_POLICIES.join(", ")}.`,
        );
      }
      const comments = env.SITE_CONFIG_FAKE_COMMENTS ?? DEFAULT_COMMENT_POLICY;
      if (!isCommentPolicy(comments)) {
        throw new Error(
          `SITE_CONFIG_FAKE_COMMENTS=${comments} is not a comment policy. Known: ${COMMENT_POLICIES.join(", ")}.`,
        );
      }
      const signUp = env.SITE_CONFIG_FAKE_SIGN_UP ?? DEFAULT_SIGN_UP_POLICY;
      if (!isSignUpPolicy(signUp)) {
        throw new Error(
          `SITE_CONFIG_FAKE_SIGN_UP=${signUp} is not a sign-up policy. Known: ${SIGN_UP_POLICIES.join(", ")}.`,
        );
      }
      const state = new FakeSiteConfigState(
        posting,
        comments,
        undefined,
        undefined,
        undefined,
        readFakeResult(env, "SITE_CONFIG_FAKE_RESULT") === "fail",
        undefined,
        undefined,
        undefined,
        signUp,
      );
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
          .register(LoadRegionRequest, new FakeLoadRegionHandler(state))
          .register(LoadSignUpPolicyRequest, new FakeLoadSignUpPolicyHandler(state))
          .register(LoadSiteIdentityRequest, new FakeLoadSiteIdentityHandler(state))
          .register(
            LoadAutoPromoteAfterApprovedPostsRequest,
            new FakeLoadAutoPromoteAfterApprovedPostsHandler(state),
          )
          .register(LoadAgentsPolicyRequest, new FakeLoadAgentsPolicyHandler(state))
          .build(),
      );
    }
  }
}
