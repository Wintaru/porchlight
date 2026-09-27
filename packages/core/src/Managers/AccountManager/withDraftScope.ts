import { type AgentScope, DEFAULT_AGENT_SCOPES } from "../../Common/AgentScope";

// The draft scope is the floor every grant stands on (SPEC.md §17): a token or an OAuth
// grant that may publish or upload must be able to see and write the drafts it acts
// on. Duplicates drop out.
export function withDraftScope(scopes: readonly AgentScope[]): readonly AgentScope[] {
  return [...new Set([...DEFAULT_AGENT_SCOPES, ...scopes])];
}
