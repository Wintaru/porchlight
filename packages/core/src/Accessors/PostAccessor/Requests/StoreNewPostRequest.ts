import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { NewPost } from "../NewPost";

// Insert. Answers PostSlugTakenResponse when the slug is already someone's.
export class StoreNewPostRequest extends RequestBase {
  constructor(
    readonly post: NewPost,
    context?: RequestContext,
  ) {
    super(context);
  }
}
