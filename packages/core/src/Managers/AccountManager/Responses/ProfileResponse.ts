import type { Profile } from "../../../Common/Profile";
import { ResponseBase } from "../../../Common/ResponseBase";

// The profile, after a read or a write.
export class ProfileResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly profile: Profile,
  ) {
    super(correlationId);
  }
}
