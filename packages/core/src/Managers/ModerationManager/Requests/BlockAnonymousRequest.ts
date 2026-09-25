import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// One-click block by anonymous token (D15). The block also carries the salted hash of
// the address that token last wrote from, so a fresh cookie from there is refused too
// (#37).
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
