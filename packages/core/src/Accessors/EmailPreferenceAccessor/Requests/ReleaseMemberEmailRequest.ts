import type { MemberEmailClaim } from "../../../Common/MemberEmailClaim";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Puts a claimed window back after its send failed.
export class ReleaseMemberEmailRequest extends RequestBase {
  constructor(
    readonly claim: MemberEmailClaim,
    context?: RequestContext,
  ) {
    super(context);
  }
}
