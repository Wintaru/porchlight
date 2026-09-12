import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { PostChanges } from "../PostChanges";

// Update by id. Answers PostNotFoundResponse for an unknown id.
export class StorePostChangesRequest extends RequestBase {
  constructor(
    readonly id: string,
    readonly changes: PostChanges,
    context?: RequestContext,
  ) {
    super(context);
  }
}
