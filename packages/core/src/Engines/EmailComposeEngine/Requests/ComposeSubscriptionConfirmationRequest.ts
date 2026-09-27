import type { DigestSchedule } from "../../../Common/DigestSchedule";
import type { EmailSite } from "../../../Common/EmailSite";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The double opt-in email (#22, D20). `authorLabel` names the author a reader follows,
// or is null for the whole site.
export class ComposeSubscriptionConfirmationRequest extends RequestBase {
  constructor(
    readonly email: string,
    readonly confirmToken: string,
    readonly authorLabel: string | null,
    readonly digest: DigestSchedule,
    readonly site: EmailSite,
    context?: RequestContext,
  ) {
    super(context);
  }
}
