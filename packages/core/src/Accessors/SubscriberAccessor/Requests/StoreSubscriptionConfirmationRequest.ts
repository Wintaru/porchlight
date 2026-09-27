import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The confirmation link's token: good for seven days and once.
export class StoreSubscriptionConfirmationRequest extends RequestBase {
  constructor(
    readonly token: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
