import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Replaces the cached HTML of one comment, and nothing else (#77).
export class StoreCommentBodyHtmlRequest extends RequestBase {
  constructor(
    readonly id: string,
    readonly bodyHtml: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
