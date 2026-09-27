import type { Actor } from "../../../Common/Actor";
import type { AgentScope } from "../../../Common/AgentScope";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A member approves an OAuth client on the consent page (D25) and picks its scopes.
// `clientId` and `clientName` come from Supabase Auth's authorization details, never
// from the form, so a member cannot grant scopes to a client other than the one asking.
// Stored as an agent token keyed by the client; an earlier live grant for the same
// client is revoked first.
export class GrantOAuthClientRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly clientId: string,
    readonly clientName: string,
    readonly scopes: readonly AgentScope[],
    context?: RequestContext,
  ) {
    super(context);
  }
}
