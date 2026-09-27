import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Finds a member's live (not revoked) OAuth grant for one client (D25). The schema's
// partial unique index keeps it to at most one row. A revoked grant is not found: an
// OAuth token has no older row to fall back to.
export class LoadLiveOAuthGrantRequest extends RequestBase {
  constructor(
    readonly ownerId: string,
    readonly clientId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
