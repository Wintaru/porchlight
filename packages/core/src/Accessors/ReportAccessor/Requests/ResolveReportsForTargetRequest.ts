import { RequestBase } from "../../../Common/RequestBase";
import type { ModerationTarget } from "../../../Common/ModerationTarget";
import type { ReportOutcome } from "../../../Common/ReportOutcome";
import type { RequestContext } from "../../../Common/RequestContext";
import type { ReportStatus } from "../../../Common/ReportStatus";

// Closes the loop a moderator action leaves open (#11, #40): every report on a target
// whose status is in `closing` moves to `status`. Which reports a decision closes is
// the Manager's rule; this only applies it. A target with nothing to close is a no-op,
// not an error.
export class ResolveReportsForTargetRequest extends RequestBase {
  constructor(
    readonly target: ModerationTarget,
    readonly status: ReportOutcome,
    readonly closing: readonly ReportStatus[],
    readonly resolvedBy: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
