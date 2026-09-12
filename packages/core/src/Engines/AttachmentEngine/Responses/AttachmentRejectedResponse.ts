import { ResponseBase } from "../../../Common/ResponseBase";
import type { AttachmentRejectionReason } from "../AttachmentRejectionReason";

export class AttachmentRejectedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: AttachmentRejectionReason,
  ) {
    super(correlationId);
  }
}
