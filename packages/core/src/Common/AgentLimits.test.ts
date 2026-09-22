import { expect, test } from "vitest";

import { DEFAULT_AGENT_LIMITS, toAgentLimits } from "./AgentLimits";

// SPEC.md §17 documents the stored shape as snake_case. This is the guard: the mapper
// and the spec must agree, or an admin who writes the documented JSON breaks drafting.
test("the documented shape parses into the domain type", () => {
  expect(toAgentLimits({ drafts_per_day: 5, publishes_per_day: 2 })).toEqual(
    DEFAULT_AGENT_LIMITS,
  );
  expect(toAgentLimits({ drafts_per_day: 0, publishes_per_day: 0 })).toEqual({
    draftsPerDay: 0,
    publishesPerDay: 0,
  });
});

test("anything else is undefined, so the caller fails loudly", () => {
  for (const value of [
    null,
    "5",
    {},
    { drafts_per_day: 5 },
    { draftsPerDay: 5, publishesPerDay: 2 },
    { drafts_per_day: -1, publishes_per_day: 2 },
    { drafts_per_day: 1.5, publishes_per_day: 2 },
  ]) {
    expect(toAgentLimits(value)).toBeUndefined();
  }
});
