import type { Actor } from "../../../Common/Actor";
import type { AgentScope } from "../../../Common/AgentScope";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A member mints a personal token for their own agent (SPEC.md §17). The raw token
// comes back once, in TokenMintedResponse, and is never stored.
export class CreateAgentTokenRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly name: string,
    readonly scopes: readonly AgentScope[],
    readonly expiresAt: Date | null,
    context?: RequestContext,
  ) {
    super(context);
  }
}
