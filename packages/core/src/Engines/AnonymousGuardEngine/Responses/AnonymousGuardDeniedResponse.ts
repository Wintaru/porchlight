import { ResponseBase } from "../../../Common/ResponseBase";
import type { AnonymousGuardDenialReason } from "../AnonymousGuardDenialReason";

export class AnonymousGuardDeniedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: AnonymousGuardDenialReason,
  ) {
    super(correlationId);
  }
}
