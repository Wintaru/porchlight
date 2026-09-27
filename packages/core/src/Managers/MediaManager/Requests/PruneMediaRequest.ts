import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Deletes those of these uploads that no post uses any more (#80). The editor sends a
// post's uploads after an explicit save, with `postId` so the ones it still uses are
// set aside first, and a deleted post's uploads after the delete, with `postId` null.
// Autosave never sends this, so an upload taken out and put back before the author
// presses Save survives.
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
