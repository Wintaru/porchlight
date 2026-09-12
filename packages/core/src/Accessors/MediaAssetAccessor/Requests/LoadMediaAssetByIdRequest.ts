import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

export class LoadMediaAssetByIdRequest extends RequestBase {
  constructor(
    readonly id: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
