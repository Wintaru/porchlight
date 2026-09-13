import type { DbClient, Json } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { RecordAuditEventRequest } from "../Requests/RecordAuditEventRequest";
import { AuditAccessFailedResponse } from "../Responses/AuditAccessFailedResponse";
import { AuditEventRecordedResponse } from "../Responses/AuditEventRecordedResponse";

export class SupabaseRecordAuditEventHandler implements IHandler<
  RecordAuditEventRequest,
  AuditEventRecordedResponse | AuditAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: RecordAuditEventRequest,
  ): Promise<AuditEventRecordedResponse | AuditAccessFailedResponse> {
    const { entry, correlationId } = request;
    const { data, error } = await this.db
      .from("audit_log")
      .insert({
        actor_id: entry.actorId,
        event: entry.event,
        subject_kind: entry.subject?.kind ?? null,
        subject_id: entry.subject?.id ?? null,
        details: entry.details as Json,
      })
      .select("id")
      .single();
    if (error) {
      return new AuditAccessFailedResponse(correlationId, error.message);
    }
    return new AuditEventRecordedResponse(correlationId, data.id);
  }
}
