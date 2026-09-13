import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A member deletes their own account (SPEC.md §10). Always the actor's own account:
// `mayManageOwnAccount` refuses this for anyone else, admin included — erasing another
// member's account is a different, unbuilt feature.
export class EraseAccountRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly profileId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
