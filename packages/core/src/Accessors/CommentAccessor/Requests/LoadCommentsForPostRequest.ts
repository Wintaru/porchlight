import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { CommentReadership } from "../CommentReadership";

// Every comment on a post the reader may see, oldest first (SPEC.md §5). The filter runs
// in the store, so a long thread never crosses the wire only to be cut down here.
export class LoadCommentsForPostRequest extends RequestBase {
  constructor(
    readonly postId: string,
    readonly readership: CommentReadership,
    context?: RequestContext,
  ) {
    super(context);
  }
}
