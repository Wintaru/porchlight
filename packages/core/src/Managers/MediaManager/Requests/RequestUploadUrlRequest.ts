import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A member requests a place to put a file (SPEC.md §6). `declaredBytes` is the
// browser's own report of the file's size, checked against the site's quota before any
// upload starts; the real byte count is re-verified at finalize, once bytes actually
// exist to count.
export class RequestUploadUrlRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly originalFilename: string,
    readonly declaredBytes: number,
    context?: RequestContext,
  ) {
    super(context);
  }
}
