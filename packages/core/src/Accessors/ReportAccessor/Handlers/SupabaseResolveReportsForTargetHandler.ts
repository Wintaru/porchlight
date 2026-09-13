import type { DbClient, TablesUpdate } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { ResolveReportsForTargetRequest } from "../Requests/ResolveReportsForTargetRequest";
import { ReportAccessFailedResponse } from "../Responses/ReportAccessFailedResponse";
import { ReportsResolvedResponse } from "../Responses/ReportsResolvedResponse";

export class SupabaseResolveReportsForTargetHandler implements IHandler<
  ResolveReportsForTargetRequest,
  ReportsResolvedResponse | ReportAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: ResolveReportsForTargetRequest,
  ): Promise<ReportsResolvedResponse | ReportAccessFailedResponse> {
    const { target, status, resolvedBy, timestamp, correlationId } = request;
    const column = target.kind === "post" ? "post_id" : "comment_id";
    const { data, error } = await this.db
      .from("reports")
      .update(toColumns(status, resolvedBy, timestamp))
      .eq(column, target.id)
      .eq("status", "open")
      .select("id");
    if (error) {
      return new ReportAccessFailedResponse(correlationId, error.message);
    }
    return new ReportsResolvedResponse(correlationId, data.length);
  }
}

// The `reports_resolved_states` CHECK allows `resolved_at` only for `resolved` and
// `dismissed` (SPEC.md §7); `escalated` must leave both `resolved_by` and `resolved_at`
// null, or Postgres refuses the row.
function toColumns(
  status: ResolveReportsForTargetRequest["status"],
  resolvedBy: string,
  timestamp: Date,
): TablesUpdate<"reports"> {
  return status === "resolved"
    ? { status, resolved_by: resolvedBy, resolved_at: timestamp.toISOString() }
    : { status };
}
