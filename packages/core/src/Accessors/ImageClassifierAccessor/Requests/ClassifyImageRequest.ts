import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

export class ClassifyImageRequest extends RequestBase {
  constructor(
    readonly bytes: Uint8Array,
    readonly mimeType: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
