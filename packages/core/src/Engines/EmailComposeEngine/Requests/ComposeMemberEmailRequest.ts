import type { EmailSite } from "../../../Common/EmailSite";
import type { MemberEmailClaim } from "../../../Common/MemberEmailClaim";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A member's digest or moderation-queue email, from what the sweep claimed.
export class ComposeMemberEmailRequest extends RequestBase {
  constructor(
    readonly claim: MemberEmailClaim,
    readonly site: EmailSite,
    context?: RequestContext,
  ) {
    super(context);
  }
}
