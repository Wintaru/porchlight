import type { MediaAsset } from "../../../Common/MediaAsset";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Publish one upload. `originalBytes` are the quarantine bytes when the caller already
// holds them (FinalizeUpload just downloaded them); absent, the engine reads them back.
export class PublishMediaRequest extends RequestBase {
  constructor(
    readonly asset: MediaAsset,
    readonly originalBytes: Uint8Array | undefined,
    context?: RequestContext,
  ) {
    super(context);
  }
}
