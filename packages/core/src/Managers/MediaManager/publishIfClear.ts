import type { MediaAsset } from "../../Common/MediaAsset";
import type { IMediaPublishEngine } from "../../Engines/MediaPublishEngine/IMediaPublishEngine";
import type { MediaUnpublishableReason } from "../../Engines/MediaPublishEngine/MediaUnpublishableReason";
import { PublishMediaRequest } from "../../Engines/MediaPublishEngine/Requests/PublishMediaRequest";
import { MediaPublishedResponse } from "../../Engines/MediaPublishEngine/Responses/MediaPublishedResponse";
import { MediaUnpublishableResponse } from "../../Engines/MediaPublishEngine/Responses/MediaUnpublishableResponse";
import { unavailable } from "./unavailable";

// A freshly finalized upload the scan cleared gets its public copy at once (#36), so an
// author can put it in a post straight away. A flagged image waits for a moderator's
// ApproveAsMature; an image that will not decode stays in quarantine with no copy. A
// failed attempt does not fail the upload: the row and the quota are already written,
// so the upload comes back without a copy and its owner can try again
// (RepublishMediaRequest). `unpublishable` says why an attempt made no copy, so the
// editor does not offer a retry that cannot work (#60).
export async function publishIfClear(
  publisher: IMediaPublishEngine,
  asset: MediaAsset,
  originalBytes: Uint8Array,
  context: { readonly correlationId: string; readonly timestamp: Date },
): Promise<{
  readonly asset: MediaAsset;
  readonly unpublishable: MediaUnpublishableReason | null;
}> {
  if (asset.scanStatus !== "clear") {
    return { asset, unpublishable: null };
  }
  const published = await publisher.transform(
    new PublishMediaRequest(asset, originalBytes, context),
  );
  if (published instanceof MediaPublishedResponse) {
    return { asset: published.asset, unpublishable: null };
  }
  if (published instanceof MediaUnpublishableResponse) {
    return { asset, unpublishable: published.reason };
  }
  const failed = unavailable(context.correlationId, published, "publisher.transform");
  console.error(
    `publish of ${asset.id} failed [${context.correlationId}]`,
    failed.reason,
  );
  return { asset, unpublishable: null };
}
