// Why an upload's claimed type did not survive the check (SPEC.md §6). Never shown to
// the uploader verbatim in more detail than this: "not allowed" reads the same whether
// the extension is outside the allowlist or the bytes disagree with it.
export const ATTACHMENT_REJECTION_REASONS = [
  "extension-not-allowed",
  "type-mismatch",
] as const;

export type AttachmentRejectionReason = (typeof ATTACHMENT_REJECTION_REASONS)[number];
