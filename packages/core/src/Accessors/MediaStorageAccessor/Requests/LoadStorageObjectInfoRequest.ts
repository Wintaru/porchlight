import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// An object's size and stored type, without its bytes. A video is too large to read
// whole into a request (#21), so its finalize starts from this.
export class LoadStorageObjectInfoRequest extends RequestBase {
  constructor(
    readonly bucket: string,
    readonly path: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
