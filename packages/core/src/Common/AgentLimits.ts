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

// The stored shape is snake_case (`drafts_per_day`), matching every other jsonb value
// in `site_config` and the shape SPEC.md §17 documents; the domain type it becomes is
// camelCase, matching every other Common type.
export function toAgentLimits(value: unknown): AgentLimits | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const { drafts_per_day: draftsPerDay, publishes_per_day: publishesPerDay } =
    value as Record<string, unknown>;
  if (!isCount(draftsPerDay) || !isCount(publishesPerDay)) {
    return undefined;
  }
  return { draftsPerDay, publishesPerDay };
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
