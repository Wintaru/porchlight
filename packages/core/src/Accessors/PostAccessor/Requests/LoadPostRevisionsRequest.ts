import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// One post's earlier versions, newest first.
export class LoadPostRevisionsRequest extends RequestBase {
  constructor(
    readonly postId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
