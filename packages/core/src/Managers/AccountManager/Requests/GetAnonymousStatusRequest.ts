import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The status page's own question, asked with no actor: holding the cookie or the code
// is the only proof of ownership an anonymous author has (D13).
export class GetAnonymousStatusRequest extends RequestBase {
  constructor(
    readonly secretOrCode: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
