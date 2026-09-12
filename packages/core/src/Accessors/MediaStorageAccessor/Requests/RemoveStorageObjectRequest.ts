import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

export class RemoveStorageObjectRequest extends RequestBase {
  constructor(
    readonly bucket: string,
    readonly path: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
