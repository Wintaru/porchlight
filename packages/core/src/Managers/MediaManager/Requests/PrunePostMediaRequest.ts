import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { PostMediaUse } from "../../../Utilities/media/postUsesMedia";

// After an explicit save (#80, #90): the editor's Save or Publish, and an agent's
// update_draft. Deletes the actor's uploads of this post that a saved version used and
// that nothing shows now. `saved` is the body and cover this save wrote: an upload it
// uses is kept even if a late autosave has since written older text over it. Autosave
// never sends this, so an upload taken out and put back before Save survives.
export class PrunePostMediaRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly postId: string,
    readonly saved: PostMediaUse,
    context?: RequestContext,
  ) {
    super(context);
  }
}
