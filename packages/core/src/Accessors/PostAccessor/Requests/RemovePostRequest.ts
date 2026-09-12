import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Hard delete. Comments, tags links and reactions go with the post (D6, the cascades).
export class RemovePostRequest extends RequestBase {
  constructor(
    readonly id: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
