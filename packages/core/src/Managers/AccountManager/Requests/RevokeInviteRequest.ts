import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// An admin stops a link from letting anyone else in (#25). People who already came in
// through it keep their accounts.
export class RevokeInviteRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly inviteId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
