import type { AnonymousUploadCap } from "../../Common/AnonymousUploadCap";
import type { AttachmentQuotaByTrust } from "../../Common/AttachmentQuota";
import type { TrustLevel } from "../../Common/TrustLevel";

// Which cap applies and the value of it, folded into one discriminated shape instead of
// a subject plus two always-present policy fields: a member's check never touches the
// D15 anonymous cap and an anonymous check never touches a trust-level table, so
// neither branch should have to carry data the other branch needs.
export type QuotaCheck =
  | {
      readonly kind: "member";
      readonly trustLevel: TrustLevel;
      readonly quotaByTrust: AttachmentQuotaByTrust;
    }
  | { readonly kind: "anonymous"; readonly cap: AnonymousUploadCap };
