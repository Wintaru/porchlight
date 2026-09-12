import { ResponseBase } from "../../../Common/ResponseBase";
import type { PermissionDenialReason } from "../../../Engines/PermissionEngine/PermissionDenialReason";

// The editor entry point hides on this (D20). `reason` lets the page say why.
export class CannotPostResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: PermissionDenialReason,
  ) {
    super(correlationId);
  }
}
