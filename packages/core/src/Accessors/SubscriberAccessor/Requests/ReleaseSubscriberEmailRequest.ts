import type { SubscriberEmailClaim } from "../../../Common/SubscriberEmailClaim";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Puts a claimed window back after its send failed.
export class ReleaseSubscriberEmailRequest extends RequestBase {
  constructor(
    readonly claim: SubscriberEmailClaim,
    context?: RequestContext,
  ) {
    super(context);
  }
}
