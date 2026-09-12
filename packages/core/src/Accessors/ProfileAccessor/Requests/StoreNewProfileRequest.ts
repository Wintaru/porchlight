import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { NewProfile } from "../NewProfile";

// Insert. Answers ProfileHandleTakenResponse when the handle is already held.
export class StoreNewProfileRequest extends RequestBase {
  constructor(
    readonly profile: NewProfile,
    context?: RequestContext,
  ) {
    super(context);
  }
}
