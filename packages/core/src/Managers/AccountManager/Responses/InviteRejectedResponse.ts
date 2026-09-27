import { ResponseBase } from "../../../Common/ResponseBase";

// Terms out of bounds: days or uses below one or above the maximum.
export class InviteRejectedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly field: "expiresInDays" | "maxUses",
  ) {
    super(correlationId);
  }
}
