import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { FileReportRequest } from "../Requests/FileReportRequest";
import { ReportAccessFailedResponse } from "../Responses/ReportAccessFailedResponse";
import { ReportAlreadyOpenResponse } from "../Responses/ReportAlreadyOpenResponse";
import { ReportStoredResponse } from "../Responses/ReportStoredResponse";
import { REPORT_COLUMNS, toReport } from "../toReport";

const UNIQUE_VIOLATION = "23505";

export class SupabaseFileReportHandler implements IHandler<
  FileReportRequest,
  ReportStoredResponse | ReportAlreadyOpenResponse | ReportAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: FileReportRequest,
  ): Promise<
    ReportStoredResponse | ReportAlreadyOpenResponse | ReportAccessFailedResponse
  > {
    const {
      reporterId,
      reporterAnonymousAuthorId,
      target,
      reason,
      details,
      startsEscalated,
      correlationId,
    } = request;
    const { data, error } = await this.db
      .from("reports")
      .insert({
        reporter_id: reporterId,
        reporter_anonymous_author_id: reporterAnonymousAuthorId,
        post_id: target.kind === "post" ? target.id : null,
        comment_id: target.kind === "comment" ? target.id : null,
        reason,
        details,
        status: startsEscalated ? "escalated" : "open",
      })
      .select(REPORT_COLUMNS)
      .single();
    if (error) {
      // The one-open-report-per-member-and-reason index (#56).
      return error.code === UNIQUE_VIOLATION
        ? new ReportAlreadyOpenResponse(correlationId)
        : new ReportAccessFailedResponse(correlationId, error.message);
    }
    return new ReportStoredResponse(correlationId, toReport(data));
  }
}
