import type { MediaAsset } from "../../../Common/MediaAsset";
import { ResponseBase } from "../../../Common/ResponseBase";

export class MediaAssetsLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly assets: readonly MediaAsset[],
  ) {
    super(correlationId);
  }
}
