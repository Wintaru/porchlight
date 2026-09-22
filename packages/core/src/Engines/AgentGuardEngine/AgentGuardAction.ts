// What an agent is about to do, for the per-token daily caps (SPEC.md §17, D22). The
// value is also the `rate_limits.action` column, so a cap is countable per action.
export const AGENT_GUARD_ACTIONS = ["agent:draft", "agent:publish"] as const;

export type AgentGuardAction = (typeof AGENT_GUARD_ACTIONS)[number];
