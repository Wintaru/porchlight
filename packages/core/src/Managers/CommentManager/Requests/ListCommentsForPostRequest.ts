import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The comment tree of a post as this actor may see it: visible comments and tombstones
// for everyone, plus the actor's own in any status, and every row for an admin.
export class ListCommentsForPostRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly postId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
