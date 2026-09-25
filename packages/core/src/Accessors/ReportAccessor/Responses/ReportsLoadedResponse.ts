import type { Report } from "../../../Common/Report";
import { ResponseBase } from "../../../Common/ResponseBase";

export class ReportsLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reports: readonly Report[],
    // Every report the filter matches, of which `reports` holds the newest
    // REPORT_LIST_LIMIT.
    readonly total: number,
  ) {
    super(correlationId);
  }
}
