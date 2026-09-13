import type { Actor } from "../../../Common/Actor";
import type { ModerationTarget } from "../../../Common/ModerationTarget";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { ReportReason } from "../../../Common/ReportReason";

// Anyone may use the report button, signed in or not (SPEC.md §7). `illegal_content`
// escalates at once instead of waiting in the open queue.
export class FileReportRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly target: ModerationTarget,
    readonly reason: ReportReason,
    readonly details: string | null,
    context?: RequestContext,
  ) {
    super(context);
  }
}
