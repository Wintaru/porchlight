import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// ListAuditLog (SPEC.md §7): the most recent entries, newest first, like every other
// feed in the app.
export class ListAuditLogRequest extends RequestBase {
  constructor(
    readonly limit: number,
    context?: RequestContext,
  ) {
    super(context);
  }
}
