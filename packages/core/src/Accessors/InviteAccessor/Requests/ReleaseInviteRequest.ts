import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Gives back one use spent by a sign-in whose profile then failed to store (#25).
export class ReleaseInviteRequest extends RequestBase {
  constructor(
    readonly tokenHash: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
