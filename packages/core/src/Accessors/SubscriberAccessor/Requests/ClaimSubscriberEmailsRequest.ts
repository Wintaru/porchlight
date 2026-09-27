import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Claims up to `limit` due reader emails whose window ends at `until`.
export class ClaimSubscriberEmailsRequest extends RequestBase {
  constructor(
    readonly until: Date,
    readonly limit: number,
    context?: RequestContext,
  ) {
    super(context);
  }
}
