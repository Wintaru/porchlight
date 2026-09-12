import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { NewMediaAsset } from "../NewMediaAsset";

export class StoreNewMediaAssetRequest extends RequestBase {
  constructor(
    readonly asset: NewMediaAsset,
    context?: RequestContext,
  ) {
    super(context);
  }
}
