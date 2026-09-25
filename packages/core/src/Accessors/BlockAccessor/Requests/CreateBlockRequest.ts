import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// BlockAnonymous's write (#11, #37): one-click block by anonymous token and the salted
// hash of the address that token last wrote from (D15). `ipHash` is null for a token
// whose row predates the hash.
export class CreateBlockRequest extends RequestBase {
  constructor(
    readonly anonymousAuthorId: string,
    readonly ipHash: string | null,
    readonly reason: string,
    readonly createdBy: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
