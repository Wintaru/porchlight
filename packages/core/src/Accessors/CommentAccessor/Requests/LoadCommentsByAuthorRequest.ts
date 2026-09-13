import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Every comment one member wrote, any status, newest first (issue #14's export
// bundle). Not filtered by readership: a member's own export includes their pending
// and rejected comments too.
export class LoadCommentsByAuthorRequest extends RequestBase {
  constructor(
    readonly profileId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
