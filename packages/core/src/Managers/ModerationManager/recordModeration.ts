import type { IAuditAccessor } from "../../Accessors/AuditAccessor/IAuditAccessor";
import { RecordAuditEventRequest } from "../../Accessors/AuditAccessor/Requests/RecordAuditEventRequest";
import { AuditEventRecordedResponse } from "../../Accessors/AuditAccessor/Responses/AuditEventRecordedResponse";
import type { IModActionAccessor } from "../../Accessors/ModActionAccessor/IModActionAccessor";
import { RecordModActionRequest } from "../../Accessors/ModActionAccessor/Requests/RecordModActionRequest";
import { ModActionRecordedResponse } from "../../Accessors/ModActionAccessor/Responses/ModActionRecordedResponse";
import type { INotificationAccessor } from "../../Accessors/NotificationAccessor/INotificationAccessor";
import { RecordNotificationRequest } from "../../Accessors/NotificationAccessor/Requests/RecordNotificationRequest";
import { NotificationStoredResponse } from "../../Accessors/NotificationAccessor/Responses/NotificationStoredResponse";
import type { IReportAccessor } from "../../Accessors/ReportAccessor/IReportAccessor";
import { ResolveReportsForTargetRequest } from "../../Accessors/ReportAccessor/Requests/ResolveReportsForTargetRequest";
import { ReportsResolvedResponse } from "../../Accessors/ReportAccessor/Responses/ReportsResolvedResponse";
import type { ModActionKind } from "../../Common/ModActionKind";
import type { ModActionTarget } from "../../Common/ModActionTarget";
import type { ModerationTarget } from "../../Common/ModerationTarget";
import type { NotificationKind } from "../../Common/NotificationKind";
import type { RequestContext } from "../../Common/RequestContext";
import type { SubjectKind } from "../../Common/SubjectKind";
import type { ModerationUnavailableResponse } from "./Responses/ModerationUnavailableResponse";
import { unavailable } from "./unavailable";

// One notification this decision should send once the paper trail is written. The
// caller resolves the recipient itself (from the item or profile it already loaded),
// since recordModeration has no accessor of its own to look one up.
export interface NotificationToSend {
  readonly recipientId: string;
  readonly kind: NotificationKind;
  readonly postId?: string;
  readonly commentId?: string;
  readonly payload?: Record<string, unknown>;
}

export interface ModerationRecord {
  readonly actorId: string;
  readonly action: ModActionKind;
  readonly target: ModActionTarget;
  readonly reason: string | null;
  readonly event: string;
  readonly auditSubject?: { readonly kind: SubjectKind; readonly id: string };
  readonly auditDetails: Record<string, unknown>;
  // Closes the loop on any open report about the same item (#11): set once a moderator
  // decides it, so a report never stays open forever with no path back to `resolved`.
  readonly resolveReportsFor?: {
    readonly target: ModerationTarget;
    readonly status: "resolved" | "escalated";
  };
  // Who to tell, once the decision is on record (SPEC.md §8). Empty for an action with
  // no member on the receiving end (block an anonymous author, approve mature media).
  readonly notify?: readonly NotificationToSend[];
}

// Every moderation action's paper trail, in one place so it is written the same way
// every time: the mod_actions row, the audit_log row, and — for an action that decides
// an item — any open reports about it.
export async function recordModeration(
  modActions: IModActionAccessor,
  auditLog: IAuditAccessor,
  reports: IReportAccessor,
  notifications: INotificationAccessor,
  record: ModerationRecord,
  context: Required<Pick<RequestContext, "correlationId">>,
): Promise<ModerationUnavailableResponse | undefined> {
  const recorded = await modActions.store(
    new RecordModActionRequest(
      record.actorId,
      record.action,
      record.target,
      record.reason,
      context,
    ),
  );
  if (!(recorded instanceof ModActionRecordedResponse)) {
    return unavailable(context.correlationId, recorded, "modActions.store");
  }

  const audited = await auditLog.store(
    new RecordAuditEventRequest(
      {
        actorId: record.actorId,
        event: record.event,
        ...(record.auditSubject !== undefined ? { subject: record.auditSubject } : {}),
        details: record.auditDetails,
      },
      context,
    ),
  );
  if (!(audited instanceof AuditEventRecordedResponse)) {
    return unavailable(context.correlationId, audited, "auditLog.store");
  }

  if (record.resolveReportsFor !== undefined) {
    const resolved = await reports.store(
      new ResolveReportsForTargetRequest(
        record.resolveReportsFor.target,
        record.resolveReportsFor.status,
        record.actorId,
        context,
      ),
    );
    if (!(resolved instanceof ReportsResolvedResponse)) {
      return unavailable(context.correlationId, resolved, "reports.store");
    }
  }

  for (const notice of record.notify ?? []) {
    const notified = await notifications.store(
      new RecordNotificationRequest(
        notice.recipientId,
        notice.kind,
        { postId: notice.postId, commentId: notice.commentId },
        notice.payload ?? {},
        context,
      ),
    );
    if (!(notified instanceof NotificationStoredResponse)) {
      return unavailable(context.correlationId, notified, "notifications.store");
    }
  }

  return undefined;
}
