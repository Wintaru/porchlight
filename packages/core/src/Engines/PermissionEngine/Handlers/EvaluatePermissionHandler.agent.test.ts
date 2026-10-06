import { describe, expect, test } from "vitest";

import {
  FakeSiteConfigState,
  fakeSiteConfigAccessor,
} from "../../../Accessors/SiteConfigAccessor/FakeSiteConfigAccessor.test-helper";
import type { Actor, AgentActor } from "../../../Common/Actor";
import type { AgentScope } from "../../../Common/AgentScope";
import type { PostVisibility } from "../../../Common/PostVisibility";
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
  visibility: PostVisibility = "public",
): PermissionSubject {
  return {
    kind: "post",
    id: "00000000-0000-4000-8000-0000000000b4",
    author: { kind: "member", profileId: authorId },
    status,
    visibility,
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

describe("an agent with the edit scope (D32)", () => {
  const EDITOR = agent(["posts:draft", "posts:edit"]);

  test("may change its member's published post, and only that member's", async () => {
    expect(await verdict(EDITOR, "post.edit", post("published"))).toBe("granted");
    expect(
      await verdict(EDITOR, "post.edit", post("published", THEO_ID, "private")),
    ).toBe("granted");
    expect(await verdict(EDITOR, "post.edit", post("published", JUNE_ID))).toBe(
      "not-allowed",
    );
  });

  test("still may not delete a published post, or touch one in the queue", async () => {
    expect(await verdict(EDITOR, "post.delete", post("published"))).toBe("not-allowed");
    expect(await verdict(EDITOR, "post.edit", post("pending"))).toBe("not-allowed");
  });

  test("is refused when the site closes agents", async () => {
    const closed = new FakeSiteConfigState("anyone", "anyone");
    closed.agents = "off";
    expect(await verdict(EDITOR, "post.edit", post("published"), closed)).toBe(
      "agents-closed",
    );
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

describe("uploads (#31)", () => {
  function media(
    scanStatus: "pending" | "clear" | "flagged" | "locked",
    publishedPath: string | null,
    ownerId = THEO_ID,
  ): PermissionSubject {
    return {
      kind: "media",
      id: "00000000-0000-4000-8000-0000000000d9",
      owner: { kind: "member", profileId: ownerId },
      publishedPath,
      scanStatus,
    };
  }

  test("uploading needs media:upload", async () => {
    expect(await verdict(agent(), "media.upload", SITE)).toBe("not-allowed");
    expect(await verdict(agent(["media:upload"]), "media.upload", SITE)).toBe("granted");
  });

  test("the member's own unpublished upload is visible with the scope, a locked one never", async () => {
    const uploader = agent(["media:upload"]);
    expect(await verdict(uploader, "media.view", media("flagged", null))).toBe("granted");
    expect(await verdict(agent(), "media.view", media("flagged", null))).toBe(
      "not-allowed",
    );
    expect(await verdict(uploader, "media.view", media("clear", null, JUNE_ID))).toBe(
      "not-allowed",
    );
    expect(await verdict(uploader, "media.view", media("locked", null))).toBe(
      "not-allowed",
    );
    expect(
      await verdict(uploader, "media.view", media("clear", "public-media/x.png")),
    ).toBe("granted");
    // Another member's published image is not the agent's to look up, and without
    // the scope not even the member's own.
    expect(
      await verdict(
        uploader,
        "media.view",
        media("clear", "public-media/x.png", JUNE_ID),
      ),
    ).toBe("not-allowed");
    expect(
      await verdict(agent(), "media.view", media("clear", "public-media/x.png")),
    ).toBe("not-allowed");
  });

  test("the draft scope prunes the member's own files, never another's (#90, C11)", async () => {
    expect(await verdict(agent(), "media.prune", media("clear", null))).toBe("granted");
    expect(await verdict(agent(), "media.prune", media("clear", null, JUNE_ID))).toBe(
      "not-allowed",
    );
    expect(
      await verdict(agent(["media:upload"]), "media.prune", media("clear", null)),
    ).toBe("not-allowed");
    // Pruning is not deleting: the draft scope never opens a delete outright.
    expect(await verdict(agent(), "media.delete", media("clear", null))).toBe(
      "not-allowed",
    );
  });
});

describe("the voice guide (#29)", () => {
  const OTHER_PROFILE: PermissionSubject = { kind: "profile", id: JUNE_ID };

  test("the draft scope reads the member's own guide, and only theirs", async () => {
    expect(await verdict(agent(), "voice.view", OWN_PROFILE)).toBe("granted");
    expect(await verdict(agent(), "voice.view", OTHER_PROFILE)).toBe("not-allowed");
    expect(await verdict(agent(["voice:write"]), "voice.view", OWN_PROFILE)).toBe(
      "not-allowed",
    );
  });

  test("changing the guide needs voice:write", async () => {
    expect(await verdict(agent(), "voice.edit", OWN_PROFILE)).toBe("not-allowed");
    expect(await verdict(agent(["voice:write"]), "voice.edit", OWN_PROFILE)).toBe(
      "granted",
    );
    expect(await verdict(agent(["voice:write"]), "voice.edit", OTHER_PROFILE)).toBe(
      "not-allowed",
    );
  });

  test("a member reads and writes their own guide, not another's", async () => {
    for (const action of ["voice.view", "voice.edit"] as const) {
      expect(await verdict(MEMBER, action, OWN_PROFILE)).toBe("granted");
      expect(await verdict(MEMBER, action, OTHER_PROFILE)).toBe("not-allowed");
    }
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
    "media.upload",
    "media.view",
    "media.prune",
    "voice.view",
    "voice.edit",
  ]);

  test("is denied to a fully scoped agent, whatever the subject", async () => {
    const everything = agent([
      "posts:draft",
      "posts:publish",
      "posts:edit",
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
        postVisibility: "public",
      },
      {
        kind: "media",
        id: "00000000-0000-4000-8000-0000000000d2",
        owner: { kind: "member", profileId: THEO_ID },
        publishedPath: null,
        scanStatus: "clear",
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

  test("token.manage follows the agents setting, so a closed site mints nothing", async () => {
    const off = new FakeSiteConfigState("anyone", "anyone");
    off.agents = "off";
    expect(await verdict(MEMBER, "token.manage", OWN_PROFILE, off)).toBe("agents-closed");

    const staffOnly = new FakeSiteConfigState("anyone", "anyone");
    staffOnly.agents = "staff";
    expect(await verdict(MEMBER, "token.manage", OWN_PROFILE, staffOnly)).toBe(
      "agents-closed",
    );
    const moderator: Actor = { kind: "member", profile: profile({ role: "moderator" }) };
    expect(await verdict(moderator, "token.manage", OWN_PROFILE, staffOnly)).toBe(
      "granted",
    );
  });
});

// D27 (#101): a private post is read by its own member's agent with the draft scope,
// the scope that already reads the member's drafts, and by no other agent.
describe("a private post (#101)", () => {
  test("its own member's agent reads it with the draft scope, and only then", async () => {
    const own = post("published", THEO_ID, "private");
    expect(await verdict(agent(), "post.view", own)).toBe("granted");
    expect(await verdict(agent(["posts:publish"]), "post.view", own)).toBe("not-allowed");
  });

  test("another member's agent never reads it, published or draft", async () => {
    for (const status of ["published", "draft"] as const) {
      expect(await verdict(agent(), "post.view", post(status, JUNE_ID, "private"))).toBe(
        "not-allowed",
      );
    }
  });

  test("its own member's agent edits it only as a draft, like any other post", async () => {
    expect(await verdict(agent(), "post.edit", post("draft", THEO_ID, "private"))).toBe(
      "granted",
    );
    expect(
      await verdict(agent(), "post.edit", post("published", THEO_ID, "private")),
    ).toBe("not-allowed");
  });
});
