import type { Profile } from "../../../Common/Profile";
import { ResponseBase } from "../../../Common/ResponseBase";

export class StaffProfilesLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly profiles: readonly Profile[],
  ) {
    super(correlationId);
  }
}
