import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A member downloads everything they made (SPEC.md §10). Always the actor's own
// account: `mayManageOwnAccount` refuses this for anyone else, admin included.
export class ExportAccountRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly profileId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
