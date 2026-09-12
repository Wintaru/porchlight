import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { ProfileChanges } from "../ProfileChanges";

// Update by id. Answers ProfileNotFoundResponse for an unknown id and
// ProfileHandleTakenResponse when the new handle is already held.
export class StoreProfileChangesRequest extends RequestBase {
  constructor(
    readonly id: string,
    readonly changes: ProfileChanges,
    context?: RequestContext,
  ) {
    super(context);
  }
}
