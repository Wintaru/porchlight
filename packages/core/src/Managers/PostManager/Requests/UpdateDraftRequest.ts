import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { PostDraftChanges } from "../PostDraftChanges";

// A save on an existing post, in any status the author may still edit. A body change
// re-renders the cached HTML (D3). The status does not change here.
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
  ) {
    super(context);
  }
}
