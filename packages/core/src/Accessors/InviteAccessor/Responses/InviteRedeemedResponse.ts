import type { TrustLevel } from "../../../Common/TrustLevel";
import { ResponseBase } from "../../../Common/ResponseBase";

// One use spent; the new member gets `trustLevel`.
export class InviteRedeemedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly trustLevel: TrustLevel,
  ) {
    super(correlationId);
  }
}
