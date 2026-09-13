import type { IAuditAccessor } from "../../Accessors/AuditAccessor/IAuditAccessor";
import { RecordAuditEventRequest } from "../../Accessors/AuditAccessor/Requests/RecordAuditEventRequest";
import { AuditEventRecordedResponse } from "../../Accessors/AuditAccessor/Responses/AuditEventRecordedResponse";
import type { IModActionAccessor } from "../../Accessors/ModActionAccessor/IModActionAccessor";
import { RecordModActionRequest } from "../../Accessors/ModActionAccessor/Requests/RecordModActionRequest";
import { ModActionRecordedResponse } from "../../Accessors/ModActionAccessor/Responses/ModActionRecordedResponse";
import type { IReportAccessor } from "../../Accessors/ReportAccessor/IReportAccessor";
import { ResolveReportsForTargetRequest } from "../../Accessors/ReportAccessor/Requests/ResolveReportsForTargetRequest";
import { ReportsResolvedResponse } from "../../Accessors/ReportAccessor/Responses/ReportsResolvedResponse";
import type { ModActionKind } from "../../Common/ModActionKind";
import type { ModActionTarget } from "../../Common/ModActionTarget";
import type { ModerationTarget } from "../../Common/ModerationTarget";
import type { RequestContext } from "../../Common/RequestContext";
import type { SubjectKind } from "../../Common/SubjectKind";
import type { ModerationUnavailableResponse } from "./Responses/ModerationUnavailableResponse";
import { unavailable } from "./unavailable";

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
}

// Every moderation action's paper trail, in one place so it is written the same way
// every time: the mod_actions row, the audit_log row, and — for an action that decides
// an item — any open reports about it.
export async function recordModeration(
  modActions: IModActionAccessor,
  auditLog: IAuditAccessor,
  reports: IReportAccessor,
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

  return undefined;
}
