import type { IHandler } from "../../../Common/IHandler";
import type { FakeAuditState } from "../FakeAuditState";
import type { RecordAuditEventRequest } from "../Requests/RecordAuditEventRequest";
import { AuditAccessFailedResponse } from "../Responses/AuditAccessFailedResponse";
import { AuditEventRecordedResponse } from "../Responses/AuditEventRecordedResponse";

export class FakeRecordAuditEventHandler implements IHandler<
  RecordAuditEventRequest,
  AuditEventRecordedResponse | AuditAccessFailedResponse
> {
  constructor(private readonly state: FakeAuditState) {}

  handle(
    request: RecordAuditEventRequest,
  ): Promise<AuditEventRecordedResponse | AuditAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new AuditAccessFailedResponse(request.correlationId, "AUDIT_FAKE_RESULT=fail"),
      );
    }
    const { entry, timestamp } = request;
    const id = this.state.nextEntryId();
    this.state.entries.push({
      id,
      actorId: entry.actorId,
      event: entry.event,
      subjectKind: entry.subject?.kind ?? null,
      subjectId: entry.subject?.id ?? null,
      details: entry.details,
      createdAt: timestamp,
    });
    return Promise.resolve(new AuditEventRecordedResponse(request.correlationId, id));
  }
}
