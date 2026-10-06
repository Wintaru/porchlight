import type { Actor } from "../../../Common/Actor";
import type { RequestOrigin } from "../../../Common/RequestOrigin";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { PostDraftChanges } from "../PostDraftChanges";

// A save on an existing post, in any status the author may still edit. A body change
// re-renders the cached HTML (D3). The status changes only when the visibility moves a
// post into or out of private (D27, `visibilityMove`): going public from private is a
// publish, and `origin` then goes into its evidence row as at a Publish. An agent's
// change to a published post needs `origin` too, for its evidence row (D32b).
// `expectedVersion` is the post's version as the caller last saw it: the save then
// applies only if nobody wrote the post since, and otherwise answers
// PostChangedResponse (#100). Without it, the last write wins.
export class UpdateDraftRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly postId: string,
    readonly changes: PostDraftChanges,
    context?: RequestContext,
    readonly expectedVersion?: number,
    readonly origin?: RequestOrigin,
  ) {
    super(context);
  }
}
