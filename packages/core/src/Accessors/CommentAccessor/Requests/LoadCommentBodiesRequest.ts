import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// One page of comment bodies in id order, after `afterId` (null for the first page),
// for the one-time re-render (#77).
export class LoadCommentBodiesRequest extends RequestBase {
  constructor(
    readonly afterId: string | null,
    readonly limit: number,
    context?: RequestContext,
  ) {
    super(context);
  }
}
