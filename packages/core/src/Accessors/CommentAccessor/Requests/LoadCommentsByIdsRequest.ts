import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Several comments by id in one read (#57), in no particular order. An id with no
// comment is simply absent from the answer.
export class LoadCommentsByIdsRequest extends RequestBase {
  constructor(
    readonly ids: readonly string[],
    context?: RequestContext,
  ) {
    super(context);
  }
}
