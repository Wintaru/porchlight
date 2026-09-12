import type { MediaKind } from "./MediaKind";

// What the server knows about one allowed extension: which kind it counts as and which
// claimed MIME types are acceptable for it. `AttachmentEngine` sniffs the real bytes and
// checks the result against this table, never against the extension alone (SPEC.md §6:
// "the server checks magic bytes, not extensions"). Denied outright and absent on
// purpose: executables, scripts, HTML, SVG, archives, macro-enabled Office (D16).
export interface AttachmentType {
  readonly extension: string;
  readonly kind: MediaKind;
  readonly mimeTypes: readonly string[];
}

export const KNOWN_ATTACHMENT_TYPES: readonly AttachmentType[] = [
  { extension: "png", kind: "image", mimeTypes: ["image/png"] },
  { extension: "jpeg", kind: "image", mimeTypes: ["image/jpeg"] },
  { extension: "gif", kind: "image", mimeTypes: ["image/gif"] },
  { extension: "webp", kind: "image", mimeTypes: ["image/webp"] },
  { extension: "avif", kind: "image", mimeTypes: ["image/avif"] },
  { extension: "pdf", kind: "document", mimeTypes: ["application/pdf"] },
  {
    extension: "docx",
    kind: "document",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },
  {
    extension: "xlsx",
    kind: "document",
    mimeTypes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  },
  {
    extension: "pptx",
    kind: "document",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
  },
  {
    extension: "odt",
    kind: "document",
    mimeTypes: ["application/vnd.oasis.opendocument.text"],
  },
  {
    extension: "ods",
    kind: "document",
    mimeTypes: ["application/vnd.oasis.opendocument.spreadsheet"],
  },
  {
    extension: "odp",
    kind: "document",
    mimeTypes: ["application/vnd.oasis.opendocument.presentation"],
  },
  { extension: "txt", kind: "document", mimeTypes: ["text/plain"] },
  { extension: "md", kind: "document", mimeTypes: ["text/markdown", "text/plain"] },
  { extension: "csv", kind: "document", mimeTypes: ["text/csv"] },
  {
    extension: "stl",
    kind: "model",
    mimeTypes: ["model/stl", "application/sla", "application/octet-stream"],
  },
  {
    extension: "gpx",
    kind: "track",
    mimeTypes: ["application/gpx+xml", "application/xml", "text/xml"],
  },
];

export function attachmentTypeForExtension(
  extension: string,
): AttachmentType | undefined {
  return KNOWN_ATTACHMENT_TYPES.find(
    (type) => type.extension === extension.toLowerCase(),
  );
}
