import type { AnonymousSubmission } from "../../../Common/AnonymousSubmission";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { AnonymousGuardAction } from "../AnonymousGuardAction";

// "May this anonymous write proceed, and who is writing it?"
export class AdmitAnonymousSubmissionRequest extends RequestBase {
  constructor(
    readonly action: AnonymousGuardAction,
    readonly submission: AnonymousSubmission,
    context?: RequestContext,
  ) {
    super(context);
  }
}
