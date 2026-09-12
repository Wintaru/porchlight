import { RequestBase } from "../../../Common/RequestBase";

// Reads `site_config.attachment_quota_by_trust` (SPEC.md §6). A missing key answers the
// default, same as every other D20-adjacent key — #12 has not seeded this one yet.
export class LoadAttachmentQuotaByTrustRequest extends RequestBase {}
