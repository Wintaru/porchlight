import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// "Is this handle one a member may hold?" Shape and the reserved list; not uniqueness.
export class ValidateHandleRequest extends RequestBase {
  constructor(
    readonly handle: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
