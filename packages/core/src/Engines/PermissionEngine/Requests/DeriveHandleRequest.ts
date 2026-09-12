import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// "Give me the Nth handle candidate for this person." `attempt` starts at 1; the caller
// raises it when the store reports the candidate taken. Every candidate is valid.
export class DeriveHandleRequest extends RequestBase {
  constructor(
    readonly email: string,
    readonly displayName: string | null,
    readonly attempt: number,
    context?: RequestContext,
  ) {
    super(context);
  }
}
