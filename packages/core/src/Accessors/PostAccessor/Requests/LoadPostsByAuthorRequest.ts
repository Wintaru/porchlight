import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Every post of one member, newest first by creation, in any status. The author's own
// list: drafts and pending posts included.
export class LoadPostsByAuthorRequest extends RequestBase {
  constructor(
    readonly profileId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
