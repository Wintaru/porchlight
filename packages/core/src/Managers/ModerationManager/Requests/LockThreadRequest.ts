import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Reuses `posts.comments_enabled` (SPEC.md §5): the same switch the author's own
// editor toggle writes, set to `false` by a moderator instead.
export class LockThreadRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly postId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
