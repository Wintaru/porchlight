import { ALL_POSTS, type PostListFilter } from "../../../Common/PostListFilter";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// One member's posts, newest first by creation: the author's own list, drafts and
// pending posts included. `filter` narrows it to one status and caps it (#44).
// Private posts (D27) come only with `withPrivate`: the author's own reads and the
// export ask for them, and a caller that forgets gets none.
export class LoadPostsByAuthorRequest extends RequestBase {
  constructor(
    readonly profileId: string,
    readonly filter: PostListFilter = ALL_POSTS,
    context?: RequestContext,
    readonly withPrivate = false,
  ) {
    super(context);
  }
}
