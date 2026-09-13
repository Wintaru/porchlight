import type { IHandler } from "../../../Common/IHandler";
import type { FakeReportState } from "../FakeReportState";
import type { ListReportsRequest } from "../Requests/ListReportsRequest";
import { ReportAccessFailedResponse } from "../Responses/ReportAccessFailedResponse";
import { ReportsLoadedResponse } from "../Responses/ReportsLoadedResponse";

export class FakeListReportsHandler implements IHandler<
  ListReportsRequest,
  ReportsLoadedResponse | ReportAccessFailedResponse
> {
  constructor(private readonly state: FakeReportState) {}

  handle(
    request: ListReportsRequest,
  ): Promise<ReportsLoadedResponse | ReportAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new ReportAccessFailedResponse(request.correlationId, "REPORT_FAKE_RESULT=fail"),
      );
    }
    const reports = [...this.state.reports.values()]
      .filter(
        (report) => request.status === undefined || report.status === request.status,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return Promise.resolve(new ReportsLoadedResponse(request.correlationId, reports));
  }
}
