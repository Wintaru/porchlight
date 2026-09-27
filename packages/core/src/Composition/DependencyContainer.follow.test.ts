import { describe, expect, test } from "vitest";

import type { Actor } from "../Common/Actor";
import type { Profile } from "../Common/Profile";
import { EnsureProfileRequest } from "../Managers/AccountManager/Requests/EnsureProfileRequest";
import { FollowRequest } from "../Managers/AccountManager/Requests/FollowRequest";
import { UnpublishPostRequest } from "../Managers/PostManager/Requests/UnpublishPostRequest";
import { SetMemberBlockRequest } from "../Managers/AccountManager/Requests/SetMemberBlockRequest";
import { UnfollowRequest } from "../Managers/AccountManager/Requests/UnfollowRequest";
import { ActionForbiddenResponse } from "../Managers/AccountManager/Responses/ActionForbiddenResponse";
import { FollowRejectedResponse } from "../Managers/AccountManager/Responses/FollowRejectedResponse";
import { FollowSetResponse } from "../Managers/AccountManager/Responses/FollowSetResponse";
import { ApproveItemRequest } from "../Managers/ModerationManager/Requests/ApproveItemRequest";
import { ListNotificationsRequest } from "../Managers/NotificationManager/Requests/ListNotificationsRequest";
import { NotificationsResponse } from "../Managers/NotificationManager/Responses/NotificationsResponse";
import { CreateDraftRequest } from "../Managers/PostManager/Requests/CreateDraftRequest";
import { PublishPostRequest } from "../Managers/PostManager/Requests/PublishPostRequest";
import { PostResponse } from "../Managers/PostManager/Responses/PostResponse";
import { DependencyContainer } from "./DependencyContainer";
import { FAKE_ENV, TEST_ORIGIN } from "./FakeEnvironment.test-helper";

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
const IVY: Actor = {
  kind: "member",
  profile: profile({
    id: "00000000-0000-4000-8000-000000000005",
    handle: "ivy",
    trustLevel: "probation",
  }),
};
const MIRA: Actor = {
  kind: "member",
  profile: profile({
    id: "00000000-0000-4000-8000-000000000002",
    handle: "mira",
    role: "moderator",
  }),
};
const THEO_AUTHOR = {
  kind: "author",
  profileId: "00000000-0000-4000-8000-000000000003",
} as const;
const HIKING = { kind: "tag", slug: "hiking" } as const;

async function withProfiles(): Promise<DependencyContainer> {
  const container = new DependencyContainer(FAKE_ENV);
  for (const actor of [THEO, JUNE, IVY, MIRA]) {
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

  test("a post that goes out tells the followers of its author and its tags, once each", async () => {
    const container = await withProfiles();
    await container.accountManager.execute(new FollowRequest(JUNE, THEO_AUTHOR));
    await container.accountManager.execute(new FollowRequest(JUNE, HIKING));
    await container.accountManager.execute(new FollowRequest(MIRA, HIKING));
    // Ivy follows Theo but muted him since: she hears nothing from him.
    await container.accountManager.execute(new FollowRequest(IVY, THEO_AUTHOR));
    await container.accountManager.execute(
      new SetMemberBlockRequest(IVY, THEO_AUTHOR.profileId, "mute"),
    );

    const post = await publish(container, THEO, ["Hiking"], "public");
    expect(await publishedNotices(container, JUNE)).toEqual([post.id]);
    expect(await publishedNotices(container, MIRA)).toEqual([post.id]);
    expect(await publishedNotices(container, IVY)).toEqual([]);
    expect(await publishedNotices(container, THEO)).toEqual([]);

    // An unlisted post is out, but only to people with the link: nobody is told.
    await publish(container, THEO, ["Hiking"], "unlisted");
    expect(await publishedNotices(container, JUNE)).toEqual([post.id]);
  });

  test("a post leaving the queue tells followers when a moderator approves it", async () => {
    const container = await withProfiles();
    await container.accountManager.execute(
      new FollowRequest(JUNE, {
        kind: "author",
        profileId: "00000000-0000-4000-8000-000000000005",
      }),
    );
    // Ivy is on probation: her post waits for a moderator, and nobody hears of it yet.
    const pending = await publish(container, IVY, [], "public");
    expect(pending.status).toBe("pending");
    expect(await publishedNotices(container, JUNE)).toEqual([]);

    await container.moderationManager.execute(
      new ApproveItemRequest(MIRA, { kind: "post", id: pending.id }),
    );
    expect(await publishedNotices(container, JUNE)).toEqual([pending.id]);
  });

  test("a post is announced once, however often it goes out", async () => {
    const container = await withProfiles();
    await container.accountManager.execute(new FollowRequest(JUNE, THEO_AUTHOR));
    const post = await publish(container, THEO, [], "public");
    await container.postManager.execute(new UnpublishPostRequest(THEO, post.id));
    await container.postManager.execute(
      new PublishPostRequest(THEO, post.id, TEST_ORIGIN),
    );
    expect(await publishedNotices(container, JUNE)).toEqual([post.id]);
  });
});

async function publish(
  container: DependencyContainer,
  actor: Actor,
  tags: readonly string[],
  visibility: "public" | "unlisted",
) {
  const drafted = await container.postManager.execute(
    new CreateDraftRequest(
      actor,
      {
        title: `A post ${String(Math.random())}`,
        bodyMd: "Words.",
        summary: null,
        tags: [...tags],
        visibility,
        commentsEnabled: true,
      },
      TEST_ORIGIN,
    ),
  );
  if (!(drafted instanceof PostResponse)) {
    throw new Error(`expected PostResponse, got ${drafted.constructor.name}`);
  }
  const published = await container.postManager.execute(
    new PublishPostRequest(actor, drafted.post.id, TEST_ORIGIN),
  );
  if (!(published instanceof PostResponse)) {
    throw new Error(`expected PostResponse, got ${published.constructor.name}`);
  }
  return published.post;
}

async function publishedNotices(container: DependencyContainer, actor: Actor) {
  const listed = await container.notificationManager.query(
    new ListNotificationsRequest(actor),
  );
  if (!(listed instanceof NotificationsResponse)) {
    throw new Error(`expected NotificationsResponse, got ${listed.constructor.name}`);
  }
  return listed.notifications
    .filter((notification) => notification.kind === "post.published")
    .map((notification) => notification.postId);
}
