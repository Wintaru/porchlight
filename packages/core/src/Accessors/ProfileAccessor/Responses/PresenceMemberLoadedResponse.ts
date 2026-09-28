import type { Profile } from "../../../Common/Profile";
import { ResponseBase } from "../../../Common/ResponseBase";

export class PresenceMemberLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly profile: Profile,
    readonly visible: boolean,
  ) {
    super(correlationId);
  }
}
