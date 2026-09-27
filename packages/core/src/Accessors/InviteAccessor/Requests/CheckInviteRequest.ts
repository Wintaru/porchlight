import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Whether a link is live, without spending it: the sign-in link form asks this before
// it mails a new address.
export class CheckInviteRequest extends RequestBase {
  constructor(
    readonly tokenHash: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
