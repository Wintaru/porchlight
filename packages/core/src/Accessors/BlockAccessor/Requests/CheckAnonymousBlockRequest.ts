import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// "Is this submission blocked?" (D15). `anonymousAuthorId` is undefined on a first
// write, before the author row exists; `ipHash` is null when the address is not known
// (no trusted proxy), since every such caller shares one placeholder and a block on it
// would refuse them all (#37). A block on the address alone still catches a first write
// from a known one.
export class CheckAnonymousBlockRequest extends RequestBase {
  constructor(
    readonly anonymousAuthorId: string | undefined,
    readonly ipHash: string | null,
    context?: RequestContext,
  ) {
    super(context);
  }
}
