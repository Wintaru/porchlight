import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { PostChanges } from "../PostChanges";

// Update by id. Answers PostNotFoundResponse for an unknown id. With `expectedVersion`,
// the update applies only while the post still has that version, and otherwise answers
// PostVersionChangedResponse and writes nothing (#100).
export class StorePostChangesRequest extends RequestBase {
  constructor(
    readonly id: string,
    readonly changes: PostChanges,
    context?: RequestContext,
    readonly expectedVersion?: number,
  ) {
    super(context);
  }
}
