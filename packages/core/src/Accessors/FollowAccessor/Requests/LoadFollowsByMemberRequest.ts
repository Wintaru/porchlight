import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Everything one member follows, oldest first. For the export bundle.
export class LoadFollowsByMemberRequest extends RequestBase {
  constructor(
    readonly followerId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
