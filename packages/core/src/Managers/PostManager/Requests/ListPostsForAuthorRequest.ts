import type { Actor } from "../../../Common/Actor";
import { ALL_POSTS, type PostListFilter } from "../../../Common/PostListFilter";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A member's own posts, newest first: the list behind the editor's index and the MCP
// door's list_posts. `filter` narrows it to one status and caps it (#44). The public
// list of an author lives in the read-model.
export class ListPostsForAuthorRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly profileId: string,
    readonly filter: PostListFilter = ALL_POSTS,
    context?: RequestContext,
  ) {
    super(context);
  }
}
