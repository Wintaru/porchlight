import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Deletes those of these uploads that no post or comment shows any more (#80, #90). A
// deleted post's uploads, read before the delete, with `postId` null. A save sends
// PrunePostMediaRequest instead.
export class PruneMediaRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly mediaIds: readonly string[],
    readonly postId: string | null,
    context?: RequestContext,
  ) {
    super(context);
  }
}
