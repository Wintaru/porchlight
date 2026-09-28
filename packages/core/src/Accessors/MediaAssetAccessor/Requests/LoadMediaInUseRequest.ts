import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Whether any post or comment, anyone's, still shows this upload (#90). The database
// decides "shows" (`media_in_use`), the same answer the prune asks for.
export class LoadMediaInUseRequest extends RequestBase {
  constructor(
    readonly mediaId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
