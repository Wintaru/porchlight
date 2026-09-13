import type { IAuditAccessor } from "../../../Accessors/AuditAccessor/IAuditAccessor";
import type { ICommentAccessor } from "../../../Accessors/CommentAccessor/ICommentAccessor";
import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import type { IReportAccessor } from "../../../Accessors/ReportAccessor/IReportAccessor";
import { FileReportRequest as StoreFileReportRequest } from "../../../Accessors/ReportAccessor/Requests/FileReportRequest";
import { ReportStoredResponse } from "../../../Accessors/ReportAccessor/Responses/ReportStoredResponse";
import { RecordAuditEventRequest } from "../../../Accessors/AuditAccessor/Requests/RecordAuditEventRequest";
import { AuditEventRecordedResponse } from "../../../Accessors/AuditAccessor/Responses/AuditEventRecordedResponse";
import type { Actor } from "../../../Common/Actor";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { isLoadedItem, loadItem, subjectOf } from "../loadItem";
import { permit } from "../permit";
import type { FileReportRequest } from "../Requests/FileReportRequest";
import type { ModerationForbiddenResponse } from "../Responses/ModerationForbiddenResponse";
import type { ModerationUnavailableResponse } from "../Responses/ModerationUnavailableResponse";
import type { NoSuchItemResponse } from "../Responses/NoSuchItemResponse";
import { ReportFiledResponse } from "../Responses/ReportFiledResponse";
import { unavailable } from "../unavailable";

type Result =
  | ReportFiledResponse
  | NoSuchItemResponse
  | ModerationForbiddenResponse
  | ModerationUnavailableResponse;

// Anyone may use the report button, signed in or not (SPEC.md §7). `illegal_content`
// escalates at once instead of waiting in the open queue.
export class FileReportHandler implements IHandler<FileReportRequest, Result> {
  constructor(
    private readonly posts: IPostAccessor,
    private readonly comments: ICommentAccessor,
    private readonly reports: IReportAccessor,
    private readonly auditLog: IAuditAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: FileReportRequest): Promise<Result> {
    const { correlationId, actor, target, reason, details, timestamp } = request;
    const context = { correlationId, timestamp };

    const item = await loadItem(this.posts, this.comments, target, context);
    if (!isLoadedItem(item)) {
      return item;
    }
    const refused = await permit(
      this.permissions,
      actor,
      "report.file",
      subjectOf(item),
      context,
    );
    if (refused !== undefined) {
      return refused;
    }

    const startsEscalated = reason === "illegal_content";
    const stored = await this.reports.store(
      new StoreFileReportRequest(
        reporterId(actor),
        target,
        reason,
        details,
        startsEscalated,
        context,
      ),
    );
    if (!(stored instanceof ReportStoredResponse)) {
      return unavailable(correlationId, stored, "reports.store");
    }

    const audited = await this.auditLog.store(
      new RecordAuditEventRequest(
        {
          actorId: reporterId(actor),
          event: "report.filed",
          subject: { kind: target.kind, id: target.id },
          details: { reason, startsEscalated },
        },
        context,
      ),
    );
    if (!(audited instanceof AuditEventRecordedResponse)) {
      return unavailable(correlationId, audited, "auditLog.store");
    }

    return new ReportFiledResponse(correlationId, stored.report);
  }
}

function reporterId(actor: Actor): string | null {
  return actor.kind === "member" ? actor.profile.id : null;
}
