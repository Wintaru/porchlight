import { ResponseBase } from "../../../Common/ResponseBase";
import type { MediaUnpublishableReason } from "../MediaUnpublishableReason";

export class MediaUnpublishableResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: MediaUnpublishableReason,
  ) {
    super(correlationId);
  }
}
