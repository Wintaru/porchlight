import { ResponseBase } from "../../../Common/ResponseBase";
import type { HandleRejectionReason } from "../HandleRejectionReason";

// The requested handle cannot be held: wrong shape, reserved, or already someone's.
export class HandleRejectedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly handle: string,
    readonly reason: HandleRejectionReason,
  ) {
    super(correlationId);
  }
}
