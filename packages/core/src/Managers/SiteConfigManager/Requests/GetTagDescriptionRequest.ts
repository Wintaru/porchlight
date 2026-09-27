import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A tag's description for its page, rendered, plus the markdown for the admin's form.
export class GetTagDescriptionRequest extends RequestBase {
  constructor(
    readonly slug: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
