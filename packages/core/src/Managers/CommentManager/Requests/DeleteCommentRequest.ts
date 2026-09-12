import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The author, or an admin, deletes a comment: hard when nothing answers it, a tombstone
// when replies do (D5).
export class DeleteCommentRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly commentId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
