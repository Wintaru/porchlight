import { extensionOf } from "./FileExtension";
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
  { extension: "heic", kind: "image", mimeTypes: ["image/heic", "image/heif"] },
  { extension: "mp4", kind: "video", mimeTypes: ["video/mp4"] },
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

// Whether a file's name claims an image (#91). The cover picker asks this before it
// converts or uploads anything, so a dropped video is refused at once and never counts
// against the quota. The name is only a claim: finalize still checks the bytes.
export function isImageFilename(filename: string): boolean {
  const extension = extensionOf(filename);
  return (
    extension !== undefined && attachmentTypeForExtension(extension)?.kind === "image"
  );
}
