import type { TrustLevel } from "./TrustLevel";

// One trust level's byte caps (SPEC.md §6: "per-file and per-account byte caps by trust
// level"). An admin has no quota (D16); this table is never consulted for one.
// A video has its own per-file cap (#21), since one is far larger than a photo; 0 means
// that trust level cannot upload video.
export interface AttachmentQuota {
  readonly maxFileBytes: number;
  readonly maxAccountBytes: number;
  readonly maxVideoFileBytes: number;
}

export type AttachmentQuotaByTrust = Readonly<Record<TrustLevel, AttachmentQuota>>;

// `site_config.attachment_quota_by_trust`. Missing from the store means this default,
// the same fallback every other D20 key uses.
// A trusted member's account holds 2 GiB, so a few videos of the 250 MiB cap fit.
export const DEFAULT_ATTACHMENT_QUOTA_BY_TRUST: AttachmentQuotaByTrust = {
  probation: {
    maxFileBytes: 5_242_880,
    maxAccountBytes: 26_214_400,
    maxVideoFileBytes: 0,
  },
  trusted: {
    maxFileBytes: 20_971_520,
    maxAccountBytes: 2_147_483_648,
    maxVideoFileBytes: 262_144_000,
  },
};
