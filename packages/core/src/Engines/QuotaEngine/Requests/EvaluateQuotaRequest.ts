import { RequestBase } from "../../../Common/RequestBase";
import type { MediaKind } from "../../../Common/MediaKind";
import type { RequestContext } from "../../../Common/RequestContext";
import type { QuotaCheck } from "../QuotaCheck";
import type { QuotaUsage } from "../QuotaUsage";

// `incomingKind` picks the per-file cap: a video has its own (#21).
export class EvaluateQuotaRequest extends RequestBase {
  constructor(
    readonly check: QuotaCheck,
    readonly incomingKind: MediaKind,
    readonly incomingBytes: number,
    readonly usage: QuotaUsage,
    context?: RequestContext,
  ) {
    super(context);
  }
}
