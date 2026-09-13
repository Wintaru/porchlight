import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Runs `erase_account` and, once it commits, deletes the auth user (SPEC.md §10). The
// caller has already removed the member's non-retained storage objects: this request
// is only the parts a Postgres function and the auth admin API can do.
export class EraseProfileRequest extends RequestBase {
  constructor(
    readonly id: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
