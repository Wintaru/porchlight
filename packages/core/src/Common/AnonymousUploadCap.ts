// `site_config.anonymous_upload_cap` (SPEC.md §4, D15): a hard, fixed-shape limit, not a
// per-trust-level allowance — an anonymous author has no trust level to key one by.
// Missing from the store means this default, matching every other D20 key's fallback.
export interface AnonymousUploadCap {
  readonly files: number;
  readonly bytesPerFile: number;
}

export const DEFAULT_ANONYMOUS_UPLOAD_CAP: AnonymousUploadCap = {
  files: 3,
  bytesPerFile: 2_097_152,
};
