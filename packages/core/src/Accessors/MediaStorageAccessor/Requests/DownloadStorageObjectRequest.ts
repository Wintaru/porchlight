import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The whole object, not a byte range: quarantine uploads are small (SPEC.md §6's caps),
// and FinalizeUpload needs the full bytes for the sha256 anyway, not just a header.
export class DownloadStorageObjectRequest extends RequestBase {
  constructor(
    readonly bucket: string,
    readonly path: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
