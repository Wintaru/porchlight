import type { Profile } from "../../../Common/Profile";
import { ResponseBase } from "../../../Common/ResponseBase";

// The profile as it stands after a suspend, ban or promote (mark_trusted) action.
export class ProfileModeratedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly profile: Profile,
  ) {
    super(correlationId);
  }
}
