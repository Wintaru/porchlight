import { RequestBase } from "../../../Common/RequestBase";
import type { ModerationTarget } from "../../../Common/ModerationTarget";
import type { RequestContext } from "../../../Common/RequestContext";
import type { ReportReason } from "../../../Common/ReportReason";

// FileReport's write (SPEC.md §7): anyone may use the report button, so `reporterId` is
// null for a visitor. An `illegal_content` reason starts life already `escalated`; the
// ModerationManager handler decides the starting status, not this accessor.
export class FileReportRequest extends RequestBase {
  constructor(
    readonly reporterId: string | null,
    readonly target: ModerationTarget,
    readonly reason: ReportReason,
    readonly details: string | null,
    readonly startsEscalated: boolean,
    context?: RequestContext,
  ) {
    super(context);
  }
}
