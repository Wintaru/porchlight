// `site_config.attachment_allowlist` (SPEC.md §6, D16): the extensions an upload may
// claim, admin-extendable from this starting set. An extension not in
// `KNOWN_ATTACHMENT_TYPES` (AttachmentTypeCatalog.ts) cannot be added: the server must
// know the magic bytes and kind for anything it accepts. Missing from the store means
// this default until #12 seeds the key, the same fallback `PostingPolicy` uses.
export const DEFAULT_ATTACHMENT_ALLOWLIST: readonly string[] = [
  "png",
  "jpeg",
  "gif",
  "webp",
  "avif",
  "pdf",
  "docx",
  "xlsx",
  "pptx",
  "odt",
  "ods",
  "odp",
  "txt",
  "md",
  "csv",
  "stl",
  "gpx",
];
