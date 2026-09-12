import {
  DEFAULT_ANONYMOUS_UPLOAD_CAP,
  type AnonymousUploadCap,
} from "../../Common/AnonymousUploadCap";
import { DEFAULT_ATTACHMENT_ALLOWLIST } from "../../Common/AttachmentAllowlist";
import {
  DEFAULT_ATTACHMENT_QUOTA_BY_TRUST,
  type AttachmentQuotaByTrust,
} from "../../Common/AttachmentQuota";
import type { CommentPolicy } from "../../Common/CommentPolicy";
import type { PostingPolicy } from "../../Common/PostingPolicy";

// The fake's rows: every D20-adjacent key read today. The three attachment keys default
// to the same values the Supabase handlers fall back to for a missing row, so a test
// that only cares about posting or comments never has to spell them out. `failing`
// makes every load answer SiteConfigAccessFailedResponse, for the error path.
export class FakeSiteConfigState {
  constructor(
    public posting: PostingPolicy,
    public comments: CommentPolicy,
    public attachmentAllowlist: readonly string[] = DEFAULT_ATTACHMENT_ALLOWLIST,
    public anonymousUploadCap: AnonymousUploadCap = DEFAULT_ANONYMOUS_UPLOAD_CAP,
    public attachmentQuotaByTrust: AttachmentQuotaByTrust = DEFAULT_ATTACHMENT_QUOTA_BY_TRUST,
    readonly failing = false,
  ) {}
}
