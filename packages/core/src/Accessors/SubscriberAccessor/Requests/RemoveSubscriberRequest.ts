import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Ends the subscription whose unsubscribe link carries `token`.
export class RemoveSubscriberRequest extends RequestBase {
  constructor(
    readonly token: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
