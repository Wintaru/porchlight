import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The uploads waiting on a moderator (#90, C13), newest first: flagged, not approved as
// mature, and not turned down. At most `limit` of them: the queue is a working set.
export class LoadHeldMediaRequest extends RequestBase {
  constructor(
    readonly limit: number,
    context?: RequestContext,
  ) {
    super(context);
  }
}
