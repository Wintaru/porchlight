import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { ListReportsRequest } from "../Requests/ListReportsRequest";
import { ReportAccessFailedResponse } from "../Responses/ReportAccessFailedResponse";
import { ReportsLoadedResponse } from "../Responses/ReportsLoadedResponse";
import { REPORT_LIST_LIMIT } from "../ReportListLimit";
import { REPORT_COLUMNS, toReport } from "../toReport";

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
      .select(REPORT_COLUMNS, { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(REPORT_LIST_LIMIT);
    if (request.status !== undefined) {
      query = query.eq("status", request.status);
    }
    const { data, error, count } = await query;
    if (error) {
      return new ReportAccessFailedResponse(request.correlationId, error.message);
    }
    return new ReportsLoadedResponse(
      request.correlationId,
      data.map(toReport),
      count ?? data.length,
    );
  }
}
