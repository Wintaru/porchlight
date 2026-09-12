import { ResponseBase } from "../../../Common/ResponseBase";
import type { AttachmentRejectionReason } from "../../../Engines/AttachmentEngine/AttachmentRejectionReason";

// The uploaded bytes did not survive AttachmentEngine's check (SPEC.md §6): an SVG
// renamed to `.png` lands here.
export class MediaRejectedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: AttachmentRejectionReason,
  ) {
    super(correlationId);
  }
}
