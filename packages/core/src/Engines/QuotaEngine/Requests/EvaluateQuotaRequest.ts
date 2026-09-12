import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { QuotaCheck } from "../QuotaCheck";
import type { QuotaUsage } from "../QuotaUsage";

export class EvaluateQuotaRequest extends RequestBase {
  constructor(
    readonly check: QuotaCheck,
    readonly incomingBytes: number,
    readonly usage: QuotaUsage,
    context?: RequestContext,
  ) {
    super(context);
  }
}
