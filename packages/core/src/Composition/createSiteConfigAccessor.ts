import type { DbClient } from "@porchlight/db";

import { FakeSiteConfigState } from "../Accessors/SiteConfigAccessor/FakeSiteConfigState";
import { FakeLoadAnonymousUploadCapHandler } from "../Accessors/SiteConfigAccessor/Handlers/FakeLoadAnonymousUploadCapHandler";
import { FakeLoadAttachmentAllowlistHandler } from "../Accessors/SiteConfigAccessor/Handlers/FakeLoadAttachmentAllowlistHandler";
import { FakeLoadAttachmentQuotaByTrustHandler } from "../Accessors/SiteConfigAccessor/Handlers/FakeLoadAttachmentQuotaByTrustHandler";
import { FakeLoadCommentPolicyHandler } from "../Accessors/SiteConfigAccessor/Handlers/FakeLoadCommentPolicyHandler";
import { FakeLoadModerationThresholdsHandler } from "../Accessors/SiteConfigAccessor/Handlers/FakeLoadModerationThresholdsHandler";
import { FakeLoadPostingPolicyHandler } from "../Accessors/SiteConfigAccessor/Handlers/FakeLoadPostingPolicyHandler";
import { FakeLoadRawIpRetentionDaysHandler } from "../Accessors/SiteConfigAccessor/Handlers/FakeLoadRawIpRetentionDaysHandler";
import { SupabaseLoadAnonymousUploadCapHandler } from "../Accessors/SiteConfigAccessor/Handlers/SupabaseLoadAnonymousUploadCapHandler";
import { SupabaseLoadAttachmentAllowlistHandler } from "../Accessors/SiteConfigAccessor/Handlers/SupabaseLoadAttachmentAllowlistHandler";
import { SupabaseLoadAttachmentQuotaByTrustHandler } from "../Accessors/SiteConfigAccessor/Handlers/SupabaseLoadAttachmentQuotaByTrustHandler";
import { SupabaseLoadCommentPolicyHandler } from "../Accessors/SiteConfigAccessor/Handlers/SupabaseLoadCommentPolicyHandler";
import { SupabaseLoadModerationThresholdsHandler } from "../Accessors/SiteConfigAccessor/Handlers/SupabaseLoadModerationThresholdsHandler";
import { SupabaseLoadPostingPolicyHandler } from "../Accessors/SiteConfigAccessor/Handlers/SupabaseLoadPostingPolicyHandler";
import { SupabaseLoadRawIpRetentionDaysHandler } from "../Accessors/SiteConfigAccessor/Handlers/SupabaseLoadRawIpRetentionDaysHandler";
import type { ISiteConfigAccessor } from "../Accessors/SiteConfigAccessor/ISiteConfigAccessor";
import { LoadAnonymousUploadCapRequest } from "../Accessors/SiteConfigAccessor/Requests/LoadAnonymousUploadCapRequest";
import { LoadAttachmentAllowlistRequest } from "../Accessors/SiteConfigAccessor/Requests/LoadAttachmentAllowlistRequest";
import { LoadAttachmentQuotaByTrustRequest } from "../Accessors/SiteConfigAccessor/Requests/LoadAttachmentQuotaByTrustRequest";
import { LoadCommentPolicyRequest } from "../Accessors/SiteConfigAccessor/Requests/LoadCommentPolicyRequest";
import { LoadModerationThresholdsRequest } from "../Accessors/SiteConfigAccessor/Requests/LoadModerationThresholdsRequest";
import { LoadPostingPolicyRequest } from "../Accessors/SiteConfigAccessor/Requests/LoadPostingPolicyRequest";
import { LoadRawIpRetentionDaysRequest } from "../Accessors/SiteConfigAccessor/Requests/LoadRawIpRetentionDaysRequest";
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
import type { Environment } from "./Environment";
import { readFakeResult, readStoreProvider } from "./readStoreProvider";

function isPostingPolicy(value: string): value is PostingPolicy {
  return POSTING_POLICIES.some((policy) => policy === value);
}

function isCommentPolicy(value: string): value is CommentPolicy {
  return COMMENT_POLICIES.some((policy) => policy === value);
}

// The store behind the D20 site settings. The fake reads its keys from
// SITE_CONFIG_FAKE_POSTING and SITE_CONFIG_FAKE_COMMENTS, so a test or a local run can
// close posting or comments without a row.
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
      const state = new FakeSiteConfigState(
        posting,
        comments,
        undefined,
        undefined,
        undefined,
        readFakeResult(env, "SITE_CONFIG_FAKE_RESULT") === "fail",
      );
      return new SiteConfigAccessor(
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
          .build(),
      );
    }
  }
}
