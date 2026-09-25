import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { TextEvidence } from "../TextEvidence";

export class StoreTextEvidenceRequest extends RequestBase {
  constructor(
    readonly evidence: TextEvidence,
    context?: RequestContext,
  ) {
    super(context);
  }
}
