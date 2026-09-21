import { Constants } from "@porchlight/db";
import { expect, test } from "vitest";

import { AGENT_SCOPES } from "../../Common/AgentScope";
import { toAgentToken } from "./toAgentToken";

// toAgentToken's `scopes` assignment proves every schema value is in the domain union.
// This proves the reverse, so the two sets are equal, not merely overlapping.
test("the domain agent scope union matches the schema enum", () => {
  expect([...AGENT_SCOPES].sort()).toEqual(
    [...Constants.public.Enums.agent_scope].sort(),
  );
});

test("toAgentToken maps a live token", () => {
  expect(
    toAgentToken({
      id: "t1",
      owner_id: "u1",
      name: "laptop",
      scopes: ["posts:draft"],
      created_at: "2026-09-21T10:00:00.000Z",
      expires_at: null,
      revoked_at: null,
      last_used_at: "2026-09-21T11:00:00.000Z",
    }),
  ).toEqual({
    id: "t1",
    ownerId: "u1",
    name: "laptop",
    scopes: ["posts:draft"],
    createdAt: new Date("2026-09-21T10:00:00.000Z"),
    expiresAt: null,
    revokedAt: null,
    lastUsedAt: new Date("2026-09-21T11:00:00.000Z"),
  });
});
