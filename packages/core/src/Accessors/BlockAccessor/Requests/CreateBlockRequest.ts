import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// BlockAnonymous's write (#11): one-click admin block by anonymous token (D15). IP-hash
// blocking needs a lookup no accessor yet provides (`submission_evidence` has none) and
// is deferred — this blocks the token only.
export class CreateBlockRequest extends RequestBase {
  constructor(
    readonly anonymousAuthorId: string,
    readonly reason: string,
    readonly createdBy: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
