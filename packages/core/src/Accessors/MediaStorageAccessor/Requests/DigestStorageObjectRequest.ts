import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The SHA-256 of a whole object, read as a stream so a large video never sits in memory
// at once (#21).
export class DigestStorageObjectRequest extends RequestBase {
  constructor(
    readonly bucket: string,
    readonly path: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
