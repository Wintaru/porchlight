import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The real bytes read back from quarantine (SPEC.md §7): the provider fingerprints the
// image itself, so the sha256 rides along only for the provider's own audit trail, not
// as a substitute for the bytes.
export class MatchImageHashRequest extends RequestBase {
  constructor(
    readonly bytes: Uint8Array,
    readonly sha256: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
