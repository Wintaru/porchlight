import type { MediaAsset } from "../../../Common/MediaAsset";
import { ResponseBase } from "../../../Common/ResponseBase";

// `downloadUrl` forces `Content-Disposition: attachment` for a non-image kind
// (SPEC.md §6) — see `CreateSignedDownloadUrlRequest`'s own comment.
export class MediaResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly asset: MediaAsset,
    readonly downloadUrl: string,
  ) {
    super(correlationId);
  }
}
