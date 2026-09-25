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
    const { target, status, closing, resolvedBy, timestamp } = request;
    let count = 0;
    for (const report of this.state.forTarget(target.kind, target.id)) {
      if (!closing.includes(report.status)) {
        continue;
      }
      this.state.reports.set(report.id, {
        ...report,
        status,
        // Mirrors the `reports_resolved_states` CHECK the Supabase handler respects:
        // `resolved` and `dismissed` carry a resolver and an instant, `escalated` not.
        resolvedBy: status === "escalated" ? null : resolvedBy,
        resolvedAt: status === "escalated" ? null : timestamp,
      });
      count += 1;
    }
    return Promise.resolve(new ReportsResolvedResponse(request.correlationId, count));
  }
}
