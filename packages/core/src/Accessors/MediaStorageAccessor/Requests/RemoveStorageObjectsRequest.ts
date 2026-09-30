import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Many objects in one bucket at once, for a removal that would otherwise be one call
// per file (an erasure).
export class RemoveStorageObjectsRequest extends RequestBase {
  constructor(
    readonly bucket: string,
    readonly paths: readonly string[],
    context?: RequestContext,
  ) {
    super(context);
  }
}
