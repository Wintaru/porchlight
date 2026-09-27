import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Spends one use of a live link, in one statement (`redeem_invite`).
export class RedeemInviteRequest extends RequestBase {
  constructor(
    readonly tokenHash: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
