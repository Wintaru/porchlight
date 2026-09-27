import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Replaces the cached HTML of one post, and nothing else (#77), only while its
// markdown is still `renderedFrom`: a save in the meantime wrote newer HTML, which must
// stay.
export class StorePostBodyHtmlRequest extends RequestBase {
  constructor(
    readonly id: string,
    readonly bodyHtml: string,
    readonly renderedFrom: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
