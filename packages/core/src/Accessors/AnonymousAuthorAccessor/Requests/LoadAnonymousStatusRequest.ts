import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Everything one anonymous author wrote, for the status page keyed by their cookie
// (D13).
export class LoadAnonymousStatusRequest extends RequestBase {
  constructor(
    readonly anonymousAuthorId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
