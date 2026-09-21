// What a personal token lets an agent do (SPEC.md §17, D22). `posts:draft` is the
// default and the anti-slop floor: a person reads and publishes in the editor.
// `posts:publish` is opt-in. The two upload and voice scopes are for #29 and #31.
// Restates the schema's `agent_scope` enum, because Common cannot import packages/db;
// toAgentToken.test.ts checks the two lists against each other.
export const AGENT_SCOPES = [
  "posts:draft",
  "posts:publish",
  "media:upload",
  "voice:write",
] as const;

export type AgentScope = (typeof AGENT_SCOPES)[number];

export const DEFAULT_AGENT_SCOPES: readonly AgentScope[] = ["posts:draft"];

export function isAgentScope(value: unknown): value is AgentScope {
  return AGENT_SCOPES.some((scope) => scope === value);
}
