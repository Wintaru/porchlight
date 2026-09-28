import type { AgentScope } from "../../../Common/AgentScope";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Revokes the member's live grant for one OAuth client, if any, and stores the new one,
// in one step (#88, D25). A failure leaves the earlier grant live. Of two at the same
// moment, both succeed and the later one is the live grant. The Manager has already
// validated the client id, the name and the scopes.
export class ReplaceOAuthGrantRequest extends RequestBase {
  constructor(
    readonly ownerId: string,
    readonly clientId: string,
    readonly name: string,
    readonly scopes: readonly AgentScope[],
    context?: RequestContext,
  ) {
    super(context);
  }
}
