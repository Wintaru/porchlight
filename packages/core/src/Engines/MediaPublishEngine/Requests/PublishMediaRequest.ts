import type { MediaAsset } from "../../../Common/MediaAsset";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { HeicPixels } from "../../../Utilities/media/decodeHeic";

// Publish one upload. `originalBytes` are the quarantine bytes when the caller already
// holds them (FinalizeUpload just downloaded them); absent, the engine reads them back.
// `heicPixels` are a HEIC's pixels the finalize scan decoded, so the copy does not
// decode the file a second time (#95).
export class PublishMediaRequest extends RequestBase {
  constructor(
    readonly asset: MediaAsset,
    readonly originalBytes: Uint8Array | undefined,
    readonly heicPixels: HeicPixels | undefined,
    context?: RequestContext,
  ) {
    super(context);
  }
}
