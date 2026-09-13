import type { IAuditAccessor } from "../../../Accessors/AuditAccessor/IAuditAccessor";
import { ListAuditLogRequest as LoadAuditLogRequest } from "../../../Accessors/AuditAccessor/Requests/ListAuditLogRequest";
import { AuditLogLoadedResponse } from "../../../Accessors/AuditAccessor/Responses/AuditLogLoadedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { permit } from "../permit";
import type { ListAuditLogRequest } from "../Requests/ListAuditLogRequest";
import { AuditLogListResponse } from "../Responses/AuditLogListResponse";
import type { ModerationForbiddenResponse } from "../Responses/ModerationForbiddenResponse";
import type { ModerationUnavailableResponse } from "../Responses/ModerationUnavailableResponse";
import { unavailable } from "../unavailable";

type Result =
  AuditLogListResponse | ModerationForbiddenResponse | ModerationUnavailableResponse;

// ListAuditLog (SPEC.md §7): staff only.
export class ListAuditLogHandler implements IHandler<ListAuditLogRequest, Result> {
  constructor(
    private readonly auditLog: IAuditAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: ListAuditLogRequest): Promise<Result> {
    const { correlationId, actor, limit, timestamp } = request;
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

    const loaded = await this.auditLog.load(new LoadAuditLogRequest(limit, context));
    if (!(loaded instanceof AuditLogLoadedResponse)) {
      return unavailable(correlationId, loaded, "auditLog.load");
    }
    return new AuditLogListResponse(correlationId, loaded.entries);
  }
}
