import type { Profile } from "../../../Common/Profile";
import { ResponseBase } from "../../../Common/ResponseBase";

export class ProfileLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly profile: Profile,
  ) {
    super(correlationId);
  }
}
