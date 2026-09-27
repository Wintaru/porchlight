import type { NewInvite } from "../NewInvite";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Makes a link.
export class StoreNewInviteRequest extends RequestBase {
  constructor(
    readonly invite: NewInvite,
    context?: RequestContext,
  ) {
    super(context);
  }
}
