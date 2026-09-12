import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Turn a comment into a tombstone: status `tombstone`, no author, empty body (D5). The
// replies under it keep their place.
export class StoreCommentTombstoneRequest extends RequestBase {
  constructor(
    readonly id: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
