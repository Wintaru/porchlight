import { ResponseBase } from "../../../Common/ResponseBase";
import type { PermissionDenialReason } from "../../../Engines/PermissionEngine/PermissionDenialReason";

// The comment form hides on this (D20). `reason` lets the page say why: `signed-out`
// offers sign-in, `comments-closed` says nothing at all.
export class CannotCommentResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: PermissionDenialReason,
  ) {
    super(correlationId);
  }
}
