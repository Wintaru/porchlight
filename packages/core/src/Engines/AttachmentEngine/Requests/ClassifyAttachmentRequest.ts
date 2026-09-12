import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// `headerBytes` is the actual uploaded object's leading bytes, read back from storage —
// never the bytes a caller merely claims to have sent. `allowlist` is the site's current
// `attachment_allowlist`, loaded by the Manager so this Engine stays pure.
export class ClassifyAttachmentRequest extends RequestBase {
  constructor(
    readonly originalFilename: string,
    readonly headerBytes: Uint8Array,
    readonly allowlist: readonly string[],
    context?: RequestContext,
  ) {
    super(context);
  }
}
