import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A moderator turns down a held upload (#90, C13). It stays in quarantine with no public
// copy, leaves the queue, and its owner is told why. The reason is required, as for a
// rejected post.
export class RejectMediaRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly mediaId: string,
    readonly reason: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
