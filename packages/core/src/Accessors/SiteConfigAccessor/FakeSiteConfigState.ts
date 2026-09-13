import {
  DEFAULT_ANONYMOUS_UPLOAD_CAP,
  type AnonymousUploadCap,
} from "../../Common/AnonymousUploadCap";
import { DEFAULT_ATTACHMENT_ALLOWLIST } from "../../Common/AttachmentAllowlist";
import {
  DEFAULT_ATTACHMENT_QUOTA_BY_TRUST,
  type AttachmentQuotaByTrust,
} from "../../Common/AttachmentQuota";
import {
  DEFAULT_AUTO_PROMOTE_AFTER_APPROVED_POSTS,
  type AutoPromoteAfterApprovedPosts,
} from "../../Common/AutoPromoteRule";
import type { CommentPolicy } from "../../Common/CommentPolicy";
import {
  DEFAULT_MODERATION_THRESHOLDS,
  type ModerationThresholds,
} from "../../Common/ModerationThresholds";
import type { PostingPolicy } from "../../Common/PostingPolicy";
import { DEFAULT_REGION, type Region } from "../../Common/Region";
import { DEFAULT_RAW_IP_RETENTION_DAYS } from "../../Common/Retention";
import { DEFAULT_SIGN_UP_POLICY, type SignUpPolicy } from "../../Common/SignUpPolicy";
import { DEFAULT_SITE_IDENTITY, type SiteIdentity } from "../../Common/SiteIdentity";
import type { SiteConfigEntry } from "./SiteConfigEntry";

// The fake's rows: every D20-adjacent key read today. The three attachment keys default
// to the same values the Supabase handlers fall back to for a missing row, so a test
// that only cares about posting or comments never has to spell them out. `failing`
// makes every load or store answer SiteConfigAccessFailedResponse, for the error path.
// `stored` collects every entry a test's store call wrote, for assertions — it does not
// feed back into the typed fields above, so a test that wants to see a written value
// reflected on the next load sets that field directly.
export class FakeSiteConfigState {
  readonly stored: SiteConfigEntry[] = [];

  constructor(
    public posting: PostingPolicy,
    public comments: CommentPolicy,
    public attachmentAllowlist: readonly string[] = DEFAULT_ATTACHMENT_ALLOWLIST,
    public anonymousUploadCap: AnonymousUploadCap = DEFAULT_ANONYMOUS_UPLOAD_CAP,
    public attachmentQuotaByTrust: AttachmentQuotaByTrust = DEFAULT_ATTACHMENT_QUOTA_BY_TRUST,
    readonly failing = false,
    public moderationThresholds: ModerationThresholds = DEFAULT_MODERATION_THRESHOLDS,
    public rawIpRetentionDays: number = DEFAULT_RAW_IP_RETENTION_DAYS,
    public region: Region = DEFAULT_REGION,
    public signUp: SignUpPolicy = DEFAULT_SIGN_UP_POLICY,
    public siteIdentity: SiteIdentity = DEFAULT_SITE_IDENTITY,
    public autoPromoteAfterApprovedPosts: AutoPromoteAfterApprovedPosts = DEFAULT_AUTO_PROMOTE_AFTER_APPROVED_POSTS,
  ) {}
}
