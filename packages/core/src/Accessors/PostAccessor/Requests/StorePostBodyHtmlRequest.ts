import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Replaces the cached HTML of one post, and nothing else (#77).
export class StorePostBodyHtmlRequest extends RequestBase {
  constructor(
    readonly id: string,
    readonly bodyHtml: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
