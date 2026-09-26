import type { MediaAsset } from "../../../Common/MediaAsset";
import { ResponseBase } from "../../../Common/ResponseBase";
import type { MediaUnpublishableReason } from "../../../Engines/MediaPublishEngine/MediaUnpublishableReason";

// The upload after another try. `publishedPath` is still null when there is nothing to
// publish yet (a flagged image waiting for a moderator) or it will not decode;
// `unpublishable` names which (#60).
export class MediaRepublishedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly asset: MediaAsset,
    readonly unpublishable: MediaUnpublishableReason | null,
  ) {
    super(correlationId);
  }
}
