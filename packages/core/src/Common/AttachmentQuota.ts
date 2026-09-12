import type { TrustLevel } from "./TrustLevel";

// One trust level's byte caps (SPEC.md §6: "per-file and per-account byte caps by trust
// level"). An admin has no quota (D16); this table is never consulted for one.
export interface AttachmentQuota {
  readonly maxFileBytes: number;
  readonly maxAccountBytes: number;
}

export type AttachmentQuotaByTrust = Readonly<Record<TrustLevel, AttachmentQuota>>;

// `site_config.attachment_quota_by_trust`. Missing from the store means this default,
// the same fallback every other D20 key uses.
export const DEFAULT_ATTACHMENT_QUOTA_BY_TRUST: AttachmentQuotaByTrust = {
  probation: { maxFileBytes: 5_242_880, maxAccountBytes: 26_214_400 },
  trusted: { maxFileBytes: 20_971_520, maxAccountBytes: 209_715_200 },
};
