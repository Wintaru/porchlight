import { attachmentTypeForExtension } from "../../Common/AttachmentTypeCatalog";
import type { MediaKind } from "../../Common/MediaKind";

// The kind an upload claims by its name, before any byte exists to check (SPEC.md §6).
// It picks the quota cap at request time (#21); finalize checks the real bytes. The
// caller has already refused an extension outside the allowlist.
export function claimedKindOf(extension: string): MediaKind {
  return attachmentTypeForExtension(extension)?.kind ?? "document";
}
