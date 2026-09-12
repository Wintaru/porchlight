import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { PostDraftChanges } from "../PostDraftChanges";

// A save on an existing post, in any status the author may still edit. A body change
// re-renders the cached HTML (D3). The status does not change here.
export class UpdateDraftRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly postId: string,
    readonly changes: PostDraftChanges,
    context?: RequestContext,
  ) {
    super(context);
  }
}
