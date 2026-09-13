import type { IHandler } from "../../../Common/IHandler";
import type { FakeReportState } from "../FakeReportState";
import type { ResolveReportsForTargetRequest } from "../Requests/ResolveReportsForTargetRequest";
import { ReportAccessFailedResponse } from "../Responses/ReportAccessFailedResponse";
import { ReportsResolvedResponse } from "../Responses/ReportsResolvedResponse";

export class FakeResolveReportsForTargetHandler implements IHandler<
  ResolveReportsForTargetRequest,
  ReportsResolvedResponse | ReportAccessFailedResponse
> {
  constructor(private readonly state: FakeReportState) {}

  handle(
    request: ResolveReportsForTargetRequest,
  ): Promise<ReportsResolvedResponse | ReportAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new ReportAccessFailedResponse(request.correlationId, "REPORT_FAKE_RESULT=fail"),
      );
    }
    const { target, status, resolvedBy, timestamp } = request;
    let count = 0;
    for (const report of this.state.forTarget(target.kind, target.id)) {
      if (report.status !== "open") {
        continue;
      }
      this.state.reports.set(report.id, {
        ...report,
        status,
        // Mirrors the `reports_resolved_states` CHECK the Supabase handler respects:
        // only `resolved` carries a resolver and an instant.
        resolvedBy: status === "resolved" ? resolvedBy : null,
        resolvedAt: status === "resolved" ? timestamp : null,
      });
      count += 1;
    }
    return Promise.resolve(new ReportsResolvedResponse(request.correlationId, count));
  }
}
