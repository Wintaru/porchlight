import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// "Is this submission blocked?" (D15). `anonymousAuthorId` is undefined on a first
// write, before the author row exists; `ipHash` is always present, so a block on the
// address alone still catches a first write from it.
export class CheckAnonymousBlockRequest extends RequestBase {
  constructor(
    readonly anonymousAuthorId: string | undefined,
    readonly ipHash: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
