import { describe, expect, test } from "vitest";

import type { Profile } from "../../Common/Profile";
import { agentDraftStamp, provenanceOf, reviewStamp } from "./provenance";

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
    expect(provenanceOf(MEMBER, AT, "Body")).toEqual({
      origin: "editor",
      agentTokenId: null,
      reviewedAt: AT,
      agentDraftMd: null,
    });
  });

  test("an agent's draft names its token and waits for a person", () => {
    expect(provenanceOf(AGENT, AT, "Body")).toEqual({
      origin: "agent",
      agentTokenId: AGENT.grant.tokenId,
      reviewedAt: null,
      agentDraftMd: "Body",
    });
  });
});

describe("agentDraftStamp", () => {
  test("an agent's first write keeps its text; nothing after it does", () => {
    expect(agentDraftStamp(AGENT, { agentDraftMd: null }, "First")).toEqual({
      agentDraftMd: "First",
    });
    expect(agentDraftStamp(AGENT, { agentDraftMd: "First" }, "Second")).toEqual({});
    expect(agentDraftStamp(AGENT, { agentDraftMd: null }, undefined)).toEqual({});
    expect(agentDraftStamp(MEMBER, { agentDraftMd: null }, "Mine")).toEqual({});
  });
});

describe("reviewStamp", () => {
  test("a person's save marks the post reviewed; an agent's changes nothing", () => {
    expect(reviewStamp(MEMBER, AT)).toEqual({ reviewedAt: AT });
    expect(reviewStamp(AGENT, AT)).toEqual({});
    expect(reviewStamp({ kind: "visitor" }, AT)).toEqual({});
  });
});
