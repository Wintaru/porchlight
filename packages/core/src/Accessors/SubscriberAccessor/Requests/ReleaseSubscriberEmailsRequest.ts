import type { SubscriberEmailClaim } from "../../../Common/SubscriberEmailClaim";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Puts claimed windows back after their send failed, all in one call (#86).
export class ReleaseSubscriberEmailsRequest extends RequestBase {
  constructor(
    readonly claims: readonly SubscriberEmailClaim[],
    context?: RequestContext,
  ) {
    super(context);
  }
}
