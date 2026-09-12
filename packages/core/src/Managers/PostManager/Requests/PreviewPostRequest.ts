import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// "What will this body look like on the page?" The editor's Preview button asks with
// the markdown as typed, and gets back the same sanitized HTML a save would cache (D3).
// Nothing is stored and no permission is needed: rendering is pure.
export class PreviewPostRequest extends RequestBase {
  constructor(
    readonly bodyMd: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
