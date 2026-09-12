import type { MediaKind } from "../../../Common/MediaKind";
import { ResponseBase } from "../../../Common/ResponseBase";

export class AttachmentClassifiedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly extension: string,
    readonly kind: MediaKind,
    readonly mimeType: string,
  ) {
    super(correlationId);
  }
}
