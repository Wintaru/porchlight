import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The salted hash of the address an anonymous author last wrote from, for a block (#37).
export class LoadAnonymousAuthorIpHashRequest extends RequestBase {
  constructor(
    readonly anonymousAuthorId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
