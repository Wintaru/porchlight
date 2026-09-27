// Why an upload's claimed type did not survive the check (SPEC.md §6). Never shown to
// the uploader verbatim in more detail than this: "not allowed" reads the same whether
// the extension is outside the allowlist or the bytes disagree with it.
// `video-not-prepared` is an MP4 the site's own editor would not have written: its
// movie box comes after the media, it keeps metadata such as a location, or it holds a
// codec some browsers cannot play (#21).
export const ATTACHMENT_REJECTION_REASONS = [
  "extension-not-allowed",
  "type-mismatch",
  "video-not-prepared",
] as const;

export type AttachmentRejectionReason = (typeof ATTACHMENT_REJECTION_REASONS)[number];
