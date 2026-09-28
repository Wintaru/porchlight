import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { StorageReadLink } from "../StorageReadLink";

// `length` bytes from `offset`, or fewer at the object's end: a video's header and its
// movie box, read without the media data (#21). Through a link from
// OpenStorageReadRequest, so a check's reads share one signature (#95).
export class DownloadStorageObjectRangeRequest extends RequestBase {
  constructor(
    readonly link: StorageReadLink,
    readonly offset: number,
    readonly length: number,
    context?: RequestContext,
  ) {
    super(context);
  }
}
