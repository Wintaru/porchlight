import type { DigestSchedule } from "../../../Common/DigestSchedule";
import type { EmailSite } from "../../../Common/EmailSite";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The double opt-in email (#22, D20). `authorHandle` is the handle of the author a
// reader follows, or null for the whole site. Never the display name (#84): anyone can
// type any address into the form, and a member can put spam in their name.
export class ComposeSubscriptionConfirmationRequest extends RequestBase {
  constructor(
    readonly email: string,
    readonly confirmToken: string,
    readonly authorHandle: string | null,
    readonly digest: DigestSchedule,
    readonly site: EmailSite,
    context?: RequestContext,
  ) {
    super(context);
  }
}
