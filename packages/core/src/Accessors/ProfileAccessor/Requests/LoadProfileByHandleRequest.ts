import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

export class LoadProfileByHandleRequest extends RequestBase {
  constructor(
    readonly handle: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
