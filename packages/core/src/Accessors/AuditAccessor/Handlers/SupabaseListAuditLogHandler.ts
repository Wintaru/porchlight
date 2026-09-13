import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { ListAuditLogRequest } from "../Requests/ListAuditLogRequest";
import { AuditAccessFailedResponse } from "../Responses/AuditAccessFailedResponse";
import { AuditLogLoadedResponse } from "../Responses/AuditLogLoadedResponse";
import { AUDIT_LOG_COLUMNS, toAuditLogEntry } from "../toAuditLogEntry";

export class SupabaseListAuditLogHandler implements IHandler<
  ListAuditLogRequest,
  AuditLogLoadedResponse | AuditAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: ListAuditLogRequest,
  ): Promise<AuditLogLoadedResponse | AuditAccessFailedResponse> {
    const { data, error } = await this.db
      .from("audit_log")
      .select(AUDIT_LOG_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(request.limit);
    if (error) {
      return new AuditAccessFailedResponse(request.correlationId, error.message);
    }
    return new AuditLogLoadedResponse(request.correlationId, data.map(toAuditLogEntry));
  }
}
