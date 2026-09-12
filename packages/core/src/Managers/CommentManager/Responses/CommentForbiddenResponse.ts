import { ResponseBase } from "../../../Common/ResponseBase";
import type { PermissionDenialReason } from "../../../Engines/PermissionEngine/PermissionDenialReason";

// The PermissionEngine said no. The Client answers 401 for `signed-out`, 403 otherwise.
export class CommentForbiddenResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: PermissionDenialReason,
  ) {
    super(correlationId);
  }
}
