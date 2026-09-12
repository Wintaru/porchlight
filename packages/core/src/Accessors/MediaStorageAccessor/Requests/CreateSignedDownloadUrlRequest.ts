import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// `forceDownload` is Supabase Storage's own `download` option on a signed URL: it sets
// `Content-Disposition: attachment`, which is how a non-image kind is "served as a
// download, never inline" straight from the storage origin (SPEC.md §6) with no proxy
// route of Porchlight's own in front of it.
export class CreateSignedDownloadUrlRequest extends RequestBase {
  constructor(
    readonly bucket: string,
    readonly path: string,
    readonly forceDownload: string | false,
    context?: RequestContext,
  ) {
    super(context);
  }
}
