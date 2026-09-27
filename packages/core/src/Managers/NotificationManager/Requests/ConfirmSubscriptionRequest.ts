import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The token from a subscription's confirmation email (#22).
export class ConfirmSubscriptionRequest extends RequestBase {
  constructor(
    readonly token: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
