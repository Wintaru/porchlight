import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// How many uploads an anonymous author already has, for the D15 fixed file-count cap
// (SPEC.md §4). A member's equivalent lives in `quotas`, kept as a running counter
// instead: an anonymous author has no account row to keep one on, so this counts
// `media_assets` directly.
export class CountMediaForAnonymousAuthorRequest extends RequestBase {
  constructor(
    readonly anonymousAuthorId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
