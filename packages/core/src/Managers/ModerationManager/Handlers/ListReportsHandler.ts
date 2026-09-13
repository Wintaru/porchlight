import type { IReportAccessor } from "../../../Accessors/ReportAccessor/IReportAccessor";
import { ListReportsRequest as LoadReportsRequest } from "../../../Accessors/ReportAccessor/Requests/ListReportsRequest";
import { ReportsLoadedResponse } from "../../../Accessors/ReportAccessor/Responses/ReportsLoadedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { permit } from "../permit";
import type { ListReportsRequest } from "../Requests/ListReportsRequest";
import type { ModerationForbiddenResponse } from "../Responses/ModerationForbiddenResponse";
import type { ModerationUnavailableResponse } from "../Responses/ModerationUnavailableResponse";
import { ReportListResponse } from "../Responses/ReportListResponse";
import { unavailable } from "../unavailable";

type Result =
  ReportListResponse | ModerationForbiddenResponse | ModerationUnavailableResponse;

// ListReports (SPEC.md §7): staff only.
export class ListReportsHandler implements IHandler<ListReportsRequest, Result> {
  constructor(
    private readonly reports: IReportAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: ListReportsRequest): Promise<Result> {
    const { correlationId, actor, status, timestamp } = request;
    const context = { correlationId, timestamp };

    const refused = await permit(
      this.permissions,
      actor,
      "report.view",
      { kind: "site" },
      context,
    );
    if (refused !== undefined) {
      return refused;
    }

    const loaded = await this.reports.load(new LoadReportsRequest(status, context));
    if (!(loaded instanceof ReportsLoadedResponse)) {
      return unavailable(correlationId, loaded, "reports.load");
    }
    return new ReportListResponse(correlationId, loaded.reports);
  }
}
