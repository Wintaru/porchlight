import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { StorageReadLink } from "../StorageReadLink";

// The SHA-256 of a whole object, read as a stream so a large video never sits in memory
// at once (#21). Through the same link as the check's range reads (#95).
export class DigestStorageObjectRequest extends RequestBase {
  constructor(
    readonly link: StorageReadLink,
    context?: RequestContext,
  ) {
    super(context);
  }
}
