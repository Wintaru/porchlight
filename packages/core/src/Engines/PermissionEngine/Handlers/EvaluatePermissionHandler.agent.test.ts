import { describe, expect, test } from "vitest";

import {
  FakeSiteConfigState,
  fakeSiteConfigAccessor,
} from "../../../Accessors/SiteConfigAccessor/FakeSiteConfigAccessor.test-helper";
import type { Actor, AgentActor } from "../../../Common/Actor";
import type { AgentScope } from "../../../Common/AgentScope";
import type { Profile } from "../../../Common/Profile";
import { PERMISSION_ACTIONS, type PermissionAction } from "../PermissionAction";
import type { PermissionDenialReason } from "../PermissionDenialReason";
import type { PermissionSubject } from "../PermissionSubject";
import { EvaluatePermissionRequest } from "../Requests/EvaluatePermissionRequest";
import { PermissionDeniedResponse } from "../Responses/PermissionDeniedResponse";
import { PermissionGrantedResponse } from "../Responses/PermissionGrantedResponse";
import { EvaluatePermissionHandler } from "./EvaluatePermissionHandler";

// Issue #27's rules for the agent actor (D22, SPEC.md §17): what a member's own agent
// may do is a short, explicit list, and everything else is refused even though the
// agent carries the member's profile.

const AT = new Date("2026-09-21T10:00:00.000Z");
const THEO_ID = "00000000-0000-4000-8000-000000000003";
const JUNE_ID = "00000000-0000-4000-8000-000000000004";

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: THEO_ID,
    handle: "theo",
    displayName: "Theo",
    avatarUrl: null,
    bio: null,
    role: "member",
    trustLevel: "trusted",
    status: "active",
    createdAt: AT,
    ...overrides,
  };
}

function agent(
  scopes: readonly AgentScope[] = ["posts:draft"],
  overrides: Partial<Profile> = {},
): AgentActor {
  return {
    kind: "agent",
    profile: profile(overrides),
    grant: { tokenId: "00000000-0000-4000-8000-0000000000f1", scopes },
  };
}

const MEMBER: Actor = { kind: "member", profile: profile() };

function post(
  status: "draft" | "published" | "pending",
  authorId = THEO_ID,
): PermissionSubject {
  return {
    kind: "post",
    id: "00000000-0000-4000-8000-0000000000b4",
    author: { kind: "member", profileId: authorId },
    status,
    commentsEnabled: true,
  };
}

const SITE: PermissionSubject = { kind: "site" };
const OWN_PROFILE: PermissionSubject = { kind: "profile", id: THEO_ID };

async function verdict(
  actor: Actor,
  action: PermissionAction,
  subject: PermissionSubject,
  state = new FakeSiteConfigState("anyone", "anyone"),
): Promise<"granted" | PermissionDenialReason> {
  const handler = new EvaluatePermissionHandler(fakeSiteConfigAccessor(state));
  const response = await handler.handle(
    new EvaluatePermissionRequest(actor, action, subject),
  );
  if (response instanceof PermissionGrantedResponse) {
    return "granted";
  }
  if (response instanceof PermissionDeniedResponse) {
    return response.reason;
  }
  throw new Error(`unexpected ${response.constructor.name}`);
}

describe("an agent with the draft scope", () => {
  test("is denied profile.edit on its own member's profile", async () => {
    expect(await verdict(agent(), "profile.edit", OWN_PROFILE)).toBe("not-allowed");
    expect(await verdict(MEMBER, "profile.edit", OWN_PROFILE)).toBe("granted");
  });

  test("may create a post, under the posting policy", async () => {
    expect(await verdict(agent(), "post.create", SITE)).toBe("granted");
    expect(
      await verdict(
        agent(),
        "post.create",
        SITE,
        new FakeSiteConfigState("staff", "anyone"),
      ),
    ).toBe("posting-closed");
  });

  test("may see, edit and delete its member's draft, and nothing in another status", async () => {
    for (const action of ["post.view", "post.edit", "post.delete"] as const) {
      expect(await verdict(agent(), action, post("draft"))).toBe("granted");
      expect(await verdict(agent(), action, post("pending"))).toBe("not-allowed");
    }
    expect(await verdict(agent(), "post.edit", post("published"))).toBe("not-allowed");
    expect(await verdict(agent(), "post.delete", post("published"))).toBe("not-allowed");
  });

  test("reads a published post like anyone, but never another member's draft", async () => {
    expect(await verdict(agent(), "post.view", post("published", JUNE_ID))).toBe(
      "granted",
    );
    expect(await verdict(agent(), "post.view", post("draft", JUNE_ID))).toBe(
      "not-allowed",
    );
  });

  test("lists its own member's posts and nobody else's", async () => {
    expect(await verdict(agent(), "post.list", OWN_PROFILE)).toBe("granted");
    expect(await verdict(agent(), "post.list", { kind: "profile", id: JUNE_ID })).toBe(
      "not-allowed",
    );
  });

  test("may not publish without the publish scope", async () => {
    expect(await verdict(agent(), "post.publish", post("draft"))).toBe("not-allowed");
    expect(
      await verdict(
        agent(["posts:draft", "posts:publish"]),
        "post.publish",
        post("draft"),
      ),
    ).toBe("granted");
    expect(
      await verdict(agent(["posts:publish"]), "post.publish", post("published")),
    ).toBe("not-allowed");
  });
});

describe("an agent without the draft scope", () => {
  test("may not create or touch drafts", async () => {
    expect(await verdict(agent(["voice:write"]), "post.create", SITE)).toBe(
      "not-allowed",
    );
    expect(await verdict(agent(["voice:write"]), "post.edit", post("draft"))).toBe(
      "not-allowed",
    );
  });
});

describe("the agents site setting", () => {
  test("off closes every agent action, staff closes a plain member's agent", async () => {
    const off = new FakeSiteConfigState("anyone", "anyone");
    off.agents = "off";
    expect(await verdict(agent(), "post.create", SITE, off)).toBe("agents-closed");

    const staffOnly = new FakeSiteConfigState("anyone", "anyone");
    staffOnly.agents = "staff";
    expect(await verdict(agent(), "post.create", SITE, staffOnly)).toBe("agents-closed");
    expect(
      await verdict(
        agent(["posts:draft"], { role: "moderator" }),
        "post.create",
        SITE,
        staffOnly,
      ),
    ).toBe("granted");
  });

  test("an inactive member's agent is refused before the setting is read", async () => {
    const failing = new FakeSiteConfigState(
      "anyone",
      "anyone",
      undefined,
      undefined,
      undefined,
      true,
    );
    expect(
      await verdict(
        agent(["posts:draft"], { status: "suspended" }),
        "post.create",
        SITE,
        failing,
      ),
    ).toBe("account-inactive");
  });
});

describe("every other action", () => {
  const OPEN_TO_AGENTS: ReadonlySet<PermissionAction> = new Set([
    "post.create",
    "post.view",
    "post.list",
    "post.edit",
    "post.publish",
    "post.delete",
    "media.view",
  ]);

  test("is denied to a fully scoped agent, whatever the subject", async () => {
    const everything = agent([
      "posts:draft",
      "posts:publish",
      "media:upload",
      "voice:write",
    ]);
    const subjects: readonly PermissionSubject[] = [
      SITE,
      OWN_PROFILE,
      post("draft"),
      post("published"),
      {
        kind: "comment",
        id: "00000000-0000-4000-8000-0000000000c1",
        author: { kind: "member", profileId: THEO_ID },
        status: "visible",
        postStatus: "published",
      },
      {
        kind: "media",
        id: "00000000-0000-4000-8000-0000000000d2",
        owner: { kind: "member", profileId: THEO_ID },
        publishedPath: null,
      },
      { kind: "anonymousAuthor", id: "00000000-0000-4000-8000-0000000000a1" },
    ];
    for (const action of PERMISSION_ACTIONS.filter((a) => !OPEN_TO_AGENTS.has(a))) {
      for (const subject of subjects) {
        expect({
          action,
          subject: subject.kind,
          v: await verdict(everything, action, subject),
        }).toEqual({
          action,
          subject: subject.kind,
          v: "not-allowed",
        });
      }
    }
  });

  test("token.manage is a member's own, never an agent's", async () => {
    expect(await verdict(MEMBER, "token.manage", OWN_PROFILE)).toBe("granted");
    expect(await verdict(MEMBER, "token.manage", { kind: "profile", id: JUNE_ID })).toBe(
      "not-allowed",
    );
    expect(await verdict(agent(), "token.manage", OWN_PROFILE)).toBe("not-allowed");
    expect(await verdict({ kind: "visitor" }, "token.manage", OWN_PROFILE)).toBe(
      "signed-out",
    );
  });
});
