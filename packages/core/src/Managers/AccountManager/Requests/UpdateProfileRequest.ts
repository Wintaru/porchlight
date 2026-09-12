import type { ProfileChanges } from "../../../Accessors/ProfileAccessor/ProfileChanges";
import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A member changes their own profile, or an admin changes anyone's. Role, trust and
// status are moderation decisions and are not on this request.
export class UpdateProfileRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly profileId: string,
    readonly changes: ProfileChanges,
    context?: RequestContext,
  ) {
    super(context);
  }
}
