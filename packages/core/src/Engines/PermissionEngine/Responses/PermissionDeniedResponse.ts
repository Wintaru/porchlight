import { ResponseBase } from "../../../Common/ResponseBase";
import type { PermissionDenialReason } from "../PermissionDenialReason";

export class PermissionDeniedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: PermissionDenialReason,
  ) {
    super(correlationId);
  }
}
