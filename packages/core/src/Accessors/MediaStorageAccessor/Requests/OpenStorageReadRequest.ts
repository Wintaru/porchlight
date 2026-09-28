import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// One link to read an object through, for a check that reads it more than once (#95):
// a video's header, its movie box and its streamed hash all go through the same link.
export class OpenStorageReadRequest extends RequestBase {
  constructor(
    readonly bucket: string,
    readonly path: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
