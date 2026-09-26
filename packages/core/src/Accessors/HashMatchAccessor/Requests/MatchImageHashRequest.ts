import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The real bytes read back from quarantine (SPEC.md §7): the provider fingerprints the
// image itself, so the sha256 rides along only for the provider's own audit trail, not
// as a substitute for the bytes. `mimeType` is the type the magic bytes proved, which
// Shield reads from the request's Content-Type.
export class MatchImageHashRequest extends RequestBase {
  constructor(
    readonly bytes: Uint8Array,
    readonly sha256: string,
    readonly mimeType: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
