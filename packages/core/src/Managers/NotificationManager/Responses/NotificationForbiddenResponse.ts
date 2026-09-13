import type { PermissionDenialReason } from "../../../Engines/PermissionEngine/PermissionDenialReason";
import { ResponseBase } from "../../../Common/ResponseBase";

export class NotificationForbiddenResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: PermissionDenialReason,
  ) {
    super(correlationId);
  }
}
