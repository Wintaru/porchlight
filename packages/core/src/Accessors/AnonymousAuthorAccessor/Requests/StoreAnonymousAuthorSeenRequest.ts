import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A returning anonymous author wrote again (D15, #37): their row keeps the salted hash
// of the address they wrote from last, so a block reaches the address they use now.
export class StoreAnonymousAuthorSeenRequest extends RequestBase {
  constructor(
    readonly anonymousAuthorId: string,
    readonly ipHash: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
