import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

export class SetGreetingRequest extends RequestBase {
  constructor(
    readonly greeting: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
