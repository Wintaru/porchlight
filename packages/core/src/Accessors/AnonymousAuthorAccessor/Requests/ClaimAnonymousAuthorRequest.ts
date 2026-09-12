import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Moves an anonymous author's posts, comments and uploads onto a profile (D7).
export class ClaimAnonymousAuthorRequest extends RequestBase {
  constructor(
    readonly anonymousAuthorId: string,
    readonly profileId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
