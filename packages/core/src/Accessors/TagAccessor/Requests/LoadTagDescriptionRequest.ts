import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

export class LoadTagDescriptionRequest extends RequestBase {
  constructor(
    readonly slug: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
