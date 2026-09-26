import type { MediaAsset } from "../../../Common/MediaAsset";
import { ResponseBase } from "../../../Common/ResponseBase";
import type { MediaUnpublishableReason } from "../../../Engines/MediaPublishEngine/MediaUnpublishableReason";

// The stored upload. `unpublishable` is why the publish attempt made no public copy
// (`undecodable`: another try cannot help), or null when it made one or never tried.
export class MediaFinalizedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly asset: MediaAsset,
    readonly unpublishable: MediaUnpublishableReason | null,
  ) {
    super(correlationId);
  }
}
