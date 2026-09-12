import type { Profile } from "../../../Common/Profile";
import { ResponseBase } from "../../../Common/ResponseBase";

// The row as it is after the write, defaults and triggers applied.
export class ProfileStoredResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly profile: Profile,
  ) {
    super(correlationId);
  }
}
