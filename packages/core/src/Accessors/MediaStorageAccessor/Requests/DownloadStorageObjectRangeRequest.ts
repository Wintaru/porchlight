import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// `length` bytes from `offset`, or fewer at the object's end: a video's header and its
// movie box, read without the media data (#21).
export class DownloadStorageObjectRangeRequest extends RequestBase {
  constructor(
    readonly bucket: string,
    readonly path: string,
    readonly offset: number,
    readonly length: number,
    context?: RequestContext,
  ) {
    super(context);
  }
}
