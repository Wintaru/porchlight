import { describe, expect, test } from "vitest";

import type { Profile } from "../../Common/Profile";
import { provenanceOf, reviewStamp } from "./provenance";

const AT = new Date("2026-09-22T10:00:00.000Z");

const PROFILE: Profile = {
  id: "00000000-0000-4000-8000-000000000003",
  handle: "theo",
  displayName: "Theo",
  avatarUrl: null,
  bio: null,
  role: "member",
  trustLevel: "trusted",
  status: "active",
  createdAt: AT,
};

const MEMBER = { kind: "member", profile: PROFILE } as const;
const AGENT = {
  kind: "agent",
  profile: PROFILE,
  grant: { tokenId: "00000000-0000-4000-8000-0000000000f1", scopes: ["posts:draft"] },
} as const;

describe("provenanceOf", () => {
  test("a person's post is written and reviewed at once", () => {
    expect(provenanceOf(MEMBER, AT)).toEqual({
      origin: "editor",
      agentTokenId: null,
      reviewedAt: AT,
    });
  });

  test("an agent's draft names its token and waits for a person", () => {
    expect(provenanceOf(AGENT, AT)).toEqual({
      origin: "agent",
      agentTokenId: AGENT.grant.tokenId,
      reviewedAt: null,
    });
  });
});

describe("reviewStamp", () => {
  test("a person's save marks the post reviewed; an agent's changes nothing", () => {
    expect(reviewStamp(MEMBER, AT)).toEqual({ reviewedAt: AT });
    expect(reviewStamp(AGENT, AT)).toEqual({});
    expect(reviewStamp({ kind: "visitor" }, AT)).toEqual({});
  });
});
