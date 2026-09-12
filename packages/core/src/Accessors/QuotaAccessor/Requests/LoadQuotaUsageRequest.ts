import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

export class LoadQuotaUsageRequest extends RequestBase {
  constructor(
    readonly profileId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
