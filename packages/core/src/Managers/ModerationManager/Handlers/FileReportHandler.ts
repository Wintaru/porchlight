import type { IAuditAccessor } from "../../../Accessors/AuditAccessor/IAuditAccessor";
import type { ICommentAccessor } from "../../../Accessors/CommentAccessor/ICommentAccessor";
import type { INotificationAccessor } from "../../../Accessors/NotificationAccessor/INotificationAccessor";
import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import type { IReportAccessor } from "../../../Accessors/ReportAccessor/IReportAccessor";
import { FileReportRequest as StoreFileReportRequest } from "../../../Accessors/ReportAccessor/Requests/FileReportRequest";
import { ReportAlreadyOpenResponse } from "../../../Accessors/ReportAccessor/Responses/ReportAlreadyOpenResponse";
import { ReportStoredResponse } from "../../../Accessors/ReportAccessor/Responses/ReportStoredResponse";
import { RecordAuditEventRequest } from "../../../Accessors/AuditAccessor/Requests/RecordAuditEventRequest";
import { AuditEventRecordedResponse } from "../../../Accessors/AuditAccessor/Responses/AuditEventRecordedResponse";
import type { Actor } from "../../../Common/Actor";
import type { IHandler } from "../../../Common/IHandler";
import { AnonymousAdmittedResponse } from "../../../Engines/AnonymousGuardEngine/Responses/AnonymousAdmittedResponse";
import { AnonymousGuardDeniedResponse } from "../../../Engines/AnonymousGuardEngine/Responses/AnonymousGuardDeniedResponse";
import type { IAnonymousGuardEngine } from "../../../Engines/AnonymousGuardEngine/IAnonymousGuardEngine";
import { AdmitAnonymousSubmissionRequest } from "../../../Engines/AnonymousGuardEngine/Requests/AdmitAnonymousSubmissionRequest";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { isLoadedItem, loadItem, subjectOf } from "../loadItem";
import { notifyStaff } from "../notifyStaff";
import { permit } from "../permit";
import type { FileReportRequest } from "../Requests/FileReportRequest";
import type { ModerationForbiddenResponse } from "../Responses/ModerationForbiddenResponse";
import type { ModerationUnavailableResponse } from "../Responses/ModerationUnavailableResponse";
import type { NoSuchItemResponse } from "../Responses/NoSuchItemResponse";
import { ReportAlreadyFiledResponse } from "../Responses/ReportAlreadyFiledResponse";
import { ReportFiledResponse } from "../Responses/ReportFiledResponse";
import { ReportGuardRefusedResponse } from "../Responses/ReportGuardRefusedResponse";
import { unavailable } from "../unavailable";

type Result =
  | ReportFiledResponse
  | ReportAlreadyFiledResponse
  | ReportGuardRefusedResponse
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
    private readonly profiles: IProfileAccessor,
    private readonly notifications: INotificationAccessor,
    private readonly permissions: IPermissionEngine,
    private readonly guard: IAnonymousGuardEngine,
  ) {}

  async handle(request: FileReportRequest): Promise<Result> {
    const { correlationId, actor, target, reason, details, submission, timestamp } =
      request;
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

    // A visitor passes the anonymous guard first, so a failed challenge or a blocked
    // address never writes a report. With no submission at all, there is no challenge
    // to pass.
    let anonymousSecret: string | null = null;
    if (actor.kind === "visitor") {
      if (submission === undefined) {
        return new ReportGuardRefusedResponse(correlationId, "turnstile-failed");
      }
      const admitted = await this.guard.evaluate(
        new AdmitAnonymousSubmissionRequest("report", submission, context),
      );
      if (admitted instanceof AnonymousGuardDeniedResponse) {
        return new ReportGuardRefusedResponse(correlationId, admitted.reason);
      }
      if (!(admitted instanceof AnonymousAdmittedResponse)) {
        return unavailable(correlationId, admitted, "guard.evaluate");
      }
      anonymousSecret = admitted.secret;
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
    if (stored instanceof ReportAlreadyOpenResponse) {
      return new ReportAlreadyFiledResponse(correlationId);
    }
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

    const notified = await notifyStaff(
      this.profiles,
      this.notifications,
      "report.filed",
      {
        ...(target.kind === "post" ? { postId: target.id } : { commentId: target.id }),
        reportId: stored.report.id,
      },
      { reason },
      context,
    );
    if (notified !== undefined) {
      return notified;
    }

    return new ReportFiledResponse(correlationId, stored.report, anonymousSecret);
  }
}

function reporterId(actor: Actor): string | null {
  return actor.kind === "member" ? actor.profile.id : null;
}
