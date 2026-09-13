import { RequestBase } from "../../../Common/RequestBase";
import type { PostStatus } from "../../../Common/PostStatus";
import type { RequestContext } from "../../../Common/RequestContext";

// Every post in one status, newest first (#11's ListQueue reads `pending`). The queue
// is a bounded working set by construction — a site with a healthy backlog still has a
// small pending count, unlike the published feed — so no page here yet.
export class LoadPostsByStatusRequest extends RequestBase {
  constructor(
    readonly status: PostStatus,
    context?: RequestContext,
  ) {
    super(context);
  }
}
