import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A member's own posts in every status, newest first: the list behind the editor's
// index. The public list of an author lives in the read-model.
export class ListPostsForAuthorRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly profileId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
