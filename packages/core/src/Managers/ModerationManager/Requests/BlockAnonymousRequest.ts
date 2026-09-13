import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// One-click admin block by anonymous token (D15). Blocks the token only — IP-hash
// blocking needs a submission_evidence lookup no accessor yet provides, and is
// deferred (see DECISIONS.md).
export class BlockAnonymousRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly anonymousAuthorId: string,
    readonly reason: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
