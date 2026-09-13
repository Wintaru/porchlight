import { RequestBase } from "../../../Common/RequestBase";
import type { CommentStatus } from "../../../Common/CommentStatus";
import type { RequestContext } from "../../../Common/RequestContext";

// Every comment in one status, newest first (#11's ListQueue reads `pending`). The
// queue is a bounded working set by construction, so no page here yet.
export class LoadCommentsByStatusRequest extends RequestBase {
  constructor(
    readonly status: CommentStatus,
    context?: RequestContext,
  ) {
    super(context);
  }
}
