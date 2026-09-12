import type { MediaAsset } from "../../../Common/MediaAsset";
import { ResponseBase } from "../../../Common/ResponseBase";

export class MediaFinalizedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly asset: MediaAsset,
  ) {
    super(correlationId);
  }
}
