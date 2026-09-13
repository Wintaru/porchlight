import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { FileReportRequest } from "../Requests/FileReportRequest";
import { ReportAccessFailedResponse } from "../Responses/ReportAccessFailedResponse";
import { ReportStoredResponse } from "../Responses/ReportStoredResponse";
import { REPORT_COLUMNS, toReport } from "../toReport";

export class SupabaseFileReportHandler implements IHandler<
  FileReportRequest,
  ReportStoredResponse | ReportAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: FileReportRequest,
  ): Promise<ReportStoredResponse | ReportAccessFailedResponse> {
    const { reporterId, target, reason, details, startsEscalated, correlationId } =
      request;
    const { data, error } = await this.db
      .from("reports")
      .insert({
        reporter_id: reporterId,
        post_id: target.kind === "post" ? target.id : null,
        comment_id: target.kind === "comment" ? target.id : null,
        reason,
        details,
        status: startsEscalated ? "escalated" : "open",
      })
      .select(REPORT_COLUMNS)
      .single();
    if (error) {
      return new ReportAccessFailedResponse(correlationId, error.message);
    }
    return new ReportStoredResponse(correlationId, toReport(data));
  }
}
