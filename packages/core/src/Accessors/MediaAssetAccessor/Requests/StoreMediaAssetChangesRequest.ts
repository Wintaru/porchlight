import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { MediaAssetChanges } from "../MediaAssetChanges";

// ApproveAsMature's write (#11): update by id, answer MediaAssetNotFoundResponse for an
// unknown one.
export class StoreMediaAssetChangesRequest extends RequestBase {
  constructor(
    readonly id: string,
    readonly changes: MediaAssetChanges,
    context?: RequestContext,
  ) {
    super(context);
  }
}
