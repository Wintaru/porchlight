import { ResponseBase } from "../../../Common/ResponseBase";
import type { ModerationLockReason } from "../ModerationLockReason";

export class ContentLockedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: ModerationLockReason,
  ) {
    super(correlationId);
  }
}
