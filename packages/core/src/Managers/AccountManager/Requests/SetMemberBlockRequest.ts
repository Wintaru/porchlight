import type { Actor } from "../../../Common/Actor";
import type { MemberBlockLevel } from "../../../Common/MemberBlockLevel";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Set how the actor shuts out another member (#23): `mute`, `block`, or `none` to take
// it back. The other member is never told.
export class SetMemberBlockRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly targetProfileId: string,
    readonly level: MemberBlockLevel | "none",
    context?: RequestContext,
  ) {
    super(context);
  }
}
