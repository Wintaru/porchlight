import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The token from an email's unsubscribe link (#22). No actor: the link works signed out.
export class UnsubscribeRequest extends RequestBase {
  constructor(
    readonly token: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
