import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { ListReportsRequest } from "../Requests/ListReportsRequest";
import { ReportAccessFailedResponse } from "../Responses/ReportAccessFailedResponse";
import { ReportsLoadedResponse } from "../Responses/ReportsLoadedResponse";
import { REPORT_COLUMNS, toReport } from "../toReport";

// A real backlog is still a small number of rows (SPEC.md §7's report list is a
// working set, not a feed); this bound exists so a runaway backlog degrades to "the
// oldest ones are missing from this page" rather than an unbounded query.
const MAX_ROWS = 500;

export class SupabaseListReportsHandler implements IHandler<
  ListReportsRequest,
  ReportsLoadedResponse | ReportAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: ListReportsRequest,
  ): Promise<ReportsLoadedResponse | ReportAccessFailedResponse> {
    let query = this.db
      .from("reports")
      .select(REPORT_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS);
    if (request.status !== undefined) {
      query = query.eq("status", request.status);
    }
    const { data, error } = await query;
    if (error) {
      return new ReportAccessFailedResponse(request.correlationId, error.message);
    }
    return new ReportsLoadedResponse(request.correlationId, data.map(toReport));
  }
}
