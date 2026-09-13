import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { NewSubmissionEvidence } from "../../../Common/NewSubmissionEvidence";
import type { MediaAuditEvent } from "../MediaAuditEvent";
import type { NewMediaAsset } from "../NewMediaAsset";

// One write, one transaction (SPEC.md §7): the media_assets row, its evidence envelope,
// and — only for a locked verdict — the audit_log entry that doubles as the escalation
// record. `auditEvent` is undefined for clear and flagged; the accessor never writes a
// row for those.
export class StoreNewMediaAssetRequest extends RequestBase {
  constructor(
    readonly asset: NewMediaAsset,
    readonly evidence: NewSubmissionEvidence,
    readonly auditEvent: MediaAuditEvent | undefined,
    context?: RequestContext,
  ) {
    super(context);
  }
}
