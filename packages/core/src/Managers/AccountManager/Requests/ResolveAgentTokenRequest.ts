import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The MCP door's first question (SPEC.md §17): who is behind this bearer token? Answers
// an agent actor, or NoAgentActorResponse for an unknown, revoked or expired token and
// for a member who is no longer active. The request's timestamp is "now" for the expiry
// check and the last-used stamp, which is why this is an `execute`: it writes.
export class ResolveAgentTokenRequest extends RequestBase {
  constructor(
    readonly rawToken: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
