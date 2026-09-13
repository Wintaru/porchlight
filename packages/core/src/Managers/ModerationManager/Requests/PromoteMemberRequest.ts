import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Trust-level promotion, an admin's call by hand (SPEC.md §4). The `PermissionEngine`
// gates this to `admin`, not `moderator`.
export class PromoteMemberRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly profileId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
