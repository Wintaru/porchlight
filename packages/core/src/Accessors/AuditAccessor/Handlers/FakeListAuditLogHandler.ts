import type { IHandler } from "../../../Common/IHandler";
import type { FakeAuditState } from "../FakeAuditState";
import type { ListAuditLogRequest } from "../Requests/ListAuditLogRequest";
import { AuditAccessFailedResponse } from "../Responses/AuditAccessFailedResponse";
import { AuditLogLoadedResponse } from "../Responses/AuditLogLoadedResponse";

export class FakeListAuditLogHandler implements IHandler<
  ListAuditLogRequest,
  AuditLogLoadedResponse | AuditAccessFailedResponse
> {
  constructor(private readonly state: FakeAuditState) {}

  handle(
    request: ListAuditLogRequest,
  ): Promise<AuditLogLoadedResponse | AuditAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new AuditAccessFailedResponse(request.correlationId, "AUDIT_FAKE_RESULT=fail"),
      );
    }
    const entries = [...this.state.entries]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, request.limit);
    return Promise.resolve(new AuditLogLoadedResponse(request.correlationId, entries));
  }
}
