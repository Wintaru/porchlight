import type { DigestSchedule } from "../../../Common/DigestSchedule";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Asks to subscribe `email` (already lower case) to the site or one author, with the
// confirmation token the email will carry.
export class StorePendingSubscriptionRequest extends RequestBase {
  constructor(
    readonly email: string,
    readonly authorId: string | null,
    readonly digest: DigestSchedule,
    readonly confirmToken: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
