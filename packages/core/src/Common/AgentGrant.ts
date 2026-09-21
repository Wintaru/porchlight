import type { AgentScope } from "./AgentScope";

// What a resolved token allows, pinned on the agent actor so a rule can read the
// scopes without another load. `tokenId` is the provenance #28 writes on a post.
export interface AgentGrant {
  readonly tokenId: string;
  readonly scopes: readonly AgentScope[];
}

export function hasScope(grant: AgentGrant, scope: AgentScope): boolean {
  return grant.scopes.includes(scope);
}
