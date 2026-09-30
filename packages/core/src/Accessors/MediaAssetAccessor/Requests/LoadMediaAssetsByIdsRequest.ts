import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Several uploads by id in one read, in no particular order. An id with no upload is
// simply absent from the answer.
export class LoadMediaAssetsByIdsRequest extends RequestBase {
  constructor(
    readonly ids: readonly string[],
    context?: RequestContext,
  ) {
    super(context);
  }
}
