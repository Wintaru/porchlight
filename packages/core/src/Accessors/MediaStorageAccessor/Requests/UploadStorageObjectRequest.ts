import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A server-side write of bytes the server made itself (#36): the re-encoded, public
// copy of an approved image. A browser's own upload never comes through here; it goes
// straight to storage on a signed URL (SPEC.md §6).
export class UploadStorageObjectRequest extends RequestBase {
  constructor(
    readonly bucket: string,
    readonly path: string,
    readonly bytes: Uint8Array,
    readonly contentType: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
