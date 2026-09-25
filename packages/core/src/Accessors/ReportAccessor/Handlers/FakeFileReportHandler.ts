import type { Report } from "../../../Common/Report";
import type { IHandler } from "../../../Common/IHandler";
import type { FakeReportState } from "../FakeReportState";
import type { FileReportRequest } from "../Requests/FileReportRequest";
import { ReportAccessFailedResponse } from "../Responses/ReportAccessFailedResponse";
import { ReportAlreadyOpenResponse } from "../Responses/ReportAlreadyOpenResponse";
import { ReportStoredResponse } from "../Responses/ReportStoredResponse";

export class FakeFileReportHandler implements IHandler<
  FileReportRequest,
  ReportStoredResponse | ReportAlreadyOpenResponse | ReportAccessFailedResponse
> {
  constructor(private readonly state: FakeReportState) {}

  handle(
    request: FileReportRequest,
  ): Promise<
    ReportStoredResponse | ReportAlreadyOpenResponse | ReportAccessFailedResponse
  > {
    if (this.state.failing) {
      return Promise.resolve(
        new ReportAccessFailedResponse(request.correlationId, "REPORT_FAKE_RESULT=fail"),
      );
    }
    const {
      reporterId,
      reporterAnonymousAuthorId,
      target,
      reason,
      details,
      startsEscalated,
      timestamp,
    } = request;
    // Mirrors the partial unique indexes on `reports` (#56).
    const duplicate =
      reporterId !== null &&
      this.state
        .forTarget(target.kind, target.id)
        .some(
          (report) =>
            report.reporterId === reporterId &&
            report.reason === reason &&
            (report.status === "open" || report.status === "escalated"),
        );
    if (duplicate) {
      return Promise.resolve(new ReportAlreadyOpenResponse(request.correlationId));
    }
    const report: Report = {
      id: globalThis.crypto.randomUUID(),
      reporterId,
      reporterAnonymousAuthorId,
      postId: target.kind === "post" ? target.id : null,
      commentId: target.kind === "comment" ? target.id : null,
      reason,
      details,
      status: startsEscalated ? "escalated" : "open",
      resolvedBy: null,
      resolvedAt: null,
      createdAt: timestamp,
    };
    this.state.reports.set(report.id, report);
    return Promise.resolve(new ReportStoredResponse(request.correlationId, report));
  }
}
