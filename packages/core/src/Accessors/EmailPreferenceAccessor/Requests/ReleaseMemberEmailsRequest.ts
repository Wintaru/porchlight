import type { MemberEmailClaim } from "../../../Common/MemberEmailClaim";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Puts claimed windows back after their send failed, all in one call (#86).
export class ReleaseMemberEmailsRequest extends RequestBase {
  constructor(
    readonly claims: readonly MemberEmailClaim[],
    context?: RequestContext,
  ) {
    super(context);
  }
}
