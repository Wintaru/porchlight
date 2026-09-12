import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

export class LoadProfileByIdRequest extends RequestBase {
  constructor(
    readonly id: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
