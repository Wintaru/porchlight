import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Replace a tag's description. Null clears it.
export class StoreTagDescriptionRequest extends RequestBase {
  constructor(
    readonly slug: string,
    readonly descriptionMd: string | null,
    context?: RequestContext,
  ) {
    super(context);
  }
}
