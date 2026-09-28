import type { IHandler } from "../../../Common/IHandler";
import type { FakeReportState } from "../FakeReportState";
import type { CountOpenReportsOnPostRequest } from "../Requests/CountOpenReportsOnPostRequest";
import { OpenReportsCountedResponse } from "../Responses/OpenReportsCountedResponse";
import { ReportAccessFailedResponse } from "../Responses/ReportAccessFailedResponse";

export class FakeCountOpenReportsOnPostHandler implements IHandler<
  CountOpenReportsOnPostRequest,
  OpenReportsCountedResponse | ReportAccessFailedResponse
> {
  constructor(private readonly state: FakeReportState) {}

  handle(
    request: CountOpenReportsOnPostRequest,
  ): Promise<OpenReportsCountedResponse | ReportAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new ReportAccessFailedResponse(request.correlationId, "REPORT_FAKE_RESULT=fail"),
      );
    }
    const count = this.state
      .forTarget("post", request.postId)
      .filter(
        (report) => report.status === "open" || report.status === "escalated",
      ).length;
    return Promise.resolve(new OpenReportsCountedResponse(request.correlationId, count));
  }
}
