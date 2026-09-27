import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Turns every email off for the member whose unsubscribe link carries `token`.
export class StoreMemberUnsubscribeRequest extends RequestBase {
  constructor(
    readonly token: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
