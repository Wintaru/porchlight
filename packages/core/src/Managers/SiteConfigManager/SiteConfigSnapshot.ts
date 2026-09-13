import type { AnonymousUploadCap } from "../../Common/AnonymousUploadCap";
import type { AttachmentQuotaByTrust } from "../../Common/AttachmentQuota";
import type { AutoPromoteAfterApprovedPosts } from "../../Common/AutoPromoteRule";
import type { CommentPolicy } from "../../Common/CommentPolicy";
import type { ModerationThresholds } from "../../Common/ModerationThresholds";
import type { PostingPolicy } from "../../Common/PostingPolicy";
import type { Region } from "../../Common/Region";
import type { SignUpPolicy } from "../../Common/SignUpPolicy";
import type { SiteIdentity } from "../../Common/SiteIdentity";

// Every `site_config` value the admin settings page shows, whole (SPEC.md §4, §7). One
// shape for both a read (`GetSiteConfigRequest`) and a write (`SaveSiteConfigRequest`
// carries a `Partial<SiteConfigSnapshot>` of only the fields it changes).
export interface SiteConfigSnapshot {
  readonly posting: PostingPolicy;
  readonly comments: CommentPolicy;
  readonly signUp: SignUpPolicy;
  readonly region: Region;
  readonly siteIdentity: SiteIdentity;
  readonly attachmentAllowlist: readonly string[];
  readonly anonymousUploadCap: AnonymousUploadCap;
  readonly attachmentQuotaByTrust: AttachmentQuotaByTrust;
  readonly moderationThresholds: ModerationThresholds;
  readonly rawIpRetentionDays: number;
  readonly autoPromoteAfterApprovedPosts: AutoPromoteAfterApprovedPosts;
}
