import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The first write from a browser with no cookie yet (D7). `ipHash` is the salted
// address the D15 block list keys on; null when the caller has no address to hash
// (never true in production, only in a test that does not care).
export class StoreNewAnonymousAuthorRequest extends RequestBase {
  constructor(
    readonly secretHash: string,
    readonly ipHash: string | null,
    context?: RequestContext,
  ) {
    super(context);
  }
}
