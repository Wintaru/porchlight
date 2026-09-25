import type { MediaAsset } from "../../../Common/MediaAsset";
import { ResponseBase } from "../../../Common/ResponseBase";

export class MediaListResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly assets: readonly MediaAsset[],
  ) {
    super(correlationId);
  }
}
