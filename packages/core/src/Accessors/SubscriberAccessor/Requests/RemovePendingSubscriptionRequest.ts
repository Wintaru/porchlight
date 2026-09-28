import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Removes the unconfirmed subscription whose confirmation email carries
// `confirmToken`, after that email did not go out (#86, C4 A). The reader can then ask
// again at once. A confirmed subscription is never removed this way.
export class RemovePendingSubscriptionRequest extends RequestBase {
  constructor(
    readonly confirmToken: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
