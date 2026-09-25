import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Try the public copy again for an upload whose first attempt failed (#36): storage or
// the database was not reachable when it was finalized.
export class RepublishMediaRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly mediaId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
