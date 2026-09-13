import { ResponseBase } from "../../../Common/ResponseBase";
import type { PermissionDenialReason } from "../../../Engines/PermissionEngine/PermissionDenialReason";

export class SiteConfigForbiddenResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: PermissionDenialReason,
  ) {
    super(correlationId);
  }
}
