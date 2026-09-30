import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Several profiles by id in one read, in no particular order. An id with no profile is
// simply absent from the answer.
export class LoadProfilesByIdsRequest extends RequestBase {
  constructor(
    readonly ids: readonly string[],
    context?: RequestContext,
  ) {
    super(context);
  }
}
