import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// `deltaFiles` is 1 on a finalized upload and -1 on a delete; `deltaBytes` the same sign,
// the file's own size. Negative deltas never carry the running total below zero (the
// `quotas_non_negative` CHECK, and the handler clamps before it gets there).
export class AdjustQuotaUsageRequest extends RequestBase {
  constructor(
    readonly profileId: string,
    readonly deltaBytes: number,
    readonly deltaFiles: number,
    context?: RequestContext,
  ) {
    super(context);
  }
}
