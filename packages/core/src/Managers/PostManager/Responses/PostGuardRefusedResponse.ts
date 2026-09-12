import { ResponseBase } from "../../../Common/ResponseBase";
import type { AnonymousGuardDenialReason } from "../../../Engines/AnonymousGuardEngine/AnonymousGuardDenialReason";

// The D15 admission guard said no, after the permission check already said the
// anonymous door is open. `reason` is deliberately generic to a visitor (D15): the
// Client shows one message whatever it is.
export class PostGuardRefusedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: AnonymousGuardDenialReason,
  ) {
    super(correlationId);
  }
}
