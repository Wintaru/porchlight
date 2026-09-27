import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Stops a link from letting anyone else in. Revoking twice changes nothing.
export class MarkInviteRevokedRequest extends RequestBase {
  constructor(
    readonly inviteId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
