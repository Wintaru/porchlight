import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The MCP door's question for an OAuth access token (D25): the Client has verified the
// JWT and read its `sub`, `client_id` and `iat` claims. Answers the same agent actor a `plt_`
// token would, from the member's live grant for that client, or NoAgentActorResponse.
// An `execute`, because it stamps last_used_at.
export class ResolveOAuthAgentRequest extends RequestBase {
  constructor(
    readonly profileId: string,
    readonly clientId: string,
    readonly issuedAt: Date,
    context?: RequestContext,
  ) {
    super(context);
  }
}
