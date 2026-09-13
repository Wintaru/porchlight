import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { NewAuditLogEntry } from "../NewAuditLogEntry";

// Every ModerationManager action, and the report-filing flow, writes one of these
// (SPEC.md §7). The table refuses UPDATE and DELETE outside retention pruning.
export class RecordAuditEventRequest extends RequestBase {
  constructor(
    readonly entry: NewAuditLogEntry,
    context?: RequestContext,
  ) {
    super(context);
  }
}
