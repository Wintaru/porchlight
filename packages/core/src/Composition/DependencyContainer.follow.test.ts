import { describe, expect, test } from "vitest";

import type { Actor } from "../Common/Actor";
import type { Profile } from "../Common/Profile";
import { EnsureProfileRequest } from "../Managers/AccountManager/Requests/EnsureProfileRequest";
import { FollowRequest } from "../Managers/AccountManager/Requests/FollowRequest";
import { UnfollowRequest } from "../Managers/AccountManager/Requests/UnfollowRequest";
import { ActionForbiddenResponse } from "../Managers/AccountManager/Responses/ActionForbiddenResponse";
import { FollowRejectedResponse } from "../Managers/AccountManager/Responses/FollowRejectedResponse";
import { FollowSetResponse } from "../Managers/AccountManager/Responses/FollowSetResponse";
import { DependencyContainer } from "./DependencyContainer";
import { FAKE_ENV } from "./FakeEnvironment.test-helper";

// Issue #24: a member follows an author or a tag, and can stop.

const AT = new Date("2026-09-26T10:00:00.000Z");

function profile(overrides: Partial<Profile>): Profile {
  return {
    id: "00000000-0000-4000-8000-000000000003",
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

const THEO: Actor = { kind: "member", profile: profile({}) };
const JUNE: Actor = {
  kind: "member",
  profile: profile({ id: "00000000-0000-4000-8000-000000000004", handle: "june" }),
};
const THEO_AUTHOR = {
  kind: "author",
  profileId: "00000000-0000-4000-8000-000000000003",
} as const;
const HIKING = { kind: "tag", slug: "hiking" } as const;

async function withProfiles(): Promise<DependencyContainer> {
  const container = new DependencyContainer(FAKE_ENV);
  for (const actor of [THEO, JUNE]) {
    if (actor.kind === "member") {
      await container.accountManager.execute(
        new EnsureProfileRequest({
          userId: actor.profile.id,
          email: `${actor.profile.handle}@example.com`,
          displayName: actor.profile.displayName,
          avatarUrl: null,
        }),
      );
    }
  }
  return container;
}

describe("DependencyContainer: follows (#24)", () => {
  test("a member follows an author and a tag, again without error, and unfollows", async () => {
    const container = await withProfiles();
    for (const target of [THEO_AUTHOR, HIKING, THEO_AUTHOR]) {
      await expect(
        container.accountManager.execute(new FollowRequest(JUNE, target)),
      ).resolves.toEqual(expect.objectContaining({ following: true }));
    }
    const off = await container.accountManager.execute(new UnfollowRequest(JUNE, HIKING));
    expect(off).toBeInstanceOf(FollowSetResponse);
    expect(off).toMatchObject({ following: false });
  });

  test("nobody follows themselves or a missing author, and a visitor follows nobody", async () => {
    const container = await withProfiles();
    await expect(
      container.accountManager.execute(new FollowRequest(THEO, THEO_AUTHOR)),
    ).resolves.toMatchObject({ reason: "self" });
    const missing = await container.accountManager.execute(
      new FollowRequest(JUNE, {
        kind: "author",
        profileId: "00000000-0000-4000-8000-0000000000ff",
      }),
    );
    expect(missing).toBeInstanceOf(FollowRejectedResponse);
    expect(missing).toMatchObject({ reason: "no-such-target" });
    const visitor = await container.accountManager.execute(
      new FollowRequest({ kind: "visitor" }, THEO_AUTHOR),
    );
    expect(visitor).toBeInstanceOf(ActionForbiddenResponse);
  });
});
