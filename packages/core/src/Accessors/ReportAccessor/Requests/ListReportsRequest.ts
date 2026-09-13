import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { ReportStatus } from "../../../Common/ReportStatus";

// ListReports (SPEC.md §7). Newest first, like every other feed in the app. An absent
// status lists every report regardless of status.
export class ListReportsRequest extends RequestBase {
  constructor(
    readonly status: ReportStatus | undefined,
    context?: RequestContext,
  ) {
    super(context);
  }
}
