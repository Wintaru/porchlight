import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Counts one submission against a fixed window (D15). subject is "ip:<hash>" or
// "anon:<author id>"; windowStart is the window's floor, so two callers in the same
// hour land on the same row.
export class BumpRateLimitRequest extends RequestBase {
  constructor(
    readonly subject: string,
    readonly action: string,
    readonly windowStart: Date,
    context?: RequestContext,
  ) {
    super(context);
  }
}
