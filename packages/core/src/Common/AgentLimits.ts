// How much one agent token may do in a day (SPEC.md §17, D22). Counted per token, per
// UTC day, through the same `rate_limits` table the anonymous guard uses. The defaults
// are deliberately small: an agent drafts, a person publishes.
export interface AgentLimits {
  readonly draftsPerDay: number;
  readonly publishesPerDay: number;
}

export const DEFAULT_AGENT_LIMITS: AgentLimits = {
  draftsPerDay: 5,
  publishesPerDay: 2,
};

export function isAgentLimits(value: unknown): value is AgentLimits {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const limits = value as Partial<Record<keyof AgentLimits, unknown>>;
  return isCount(limits.draftsPerDay) && isCount(limits.publishesPerDay);
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
