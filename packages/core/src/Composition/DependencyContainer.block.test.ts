import { describe, expect, test } from "vitest";

import type { Actor } from "../Common/Actor";
import type { Comment } from "../Common/Comment";
import type { MemberBlockLevel } from "../Common/MemberBlockLevel";
import type { Post } from "../Common/Post";
import type { Profile } from "../Common/Profile";
import { EnsureProfileRequest } from "../Managers/AccountManager/Requests/EnsureProfileRequest";
import { SetMemberBlockRequest } from "../Managers/AccountManager/Requests/SetMemberBlockRequest";
import { ActionForbiddenResponse } from "../Managers/AccountManager/Responses/ActionForbiddenResponse";
import { MemberBlockRejectedResponse } from "../Managers/AccountManager/Responses/MemberBlockRejectedResponse";
import { MemberBlockSetResponse } from "../Managers/AccountManager/Responses/MemberBlockSetResponse";
import { NoSuchProfileResponse } from "../Managers/AccountManager/Responses/NoSuchProfileResponse";
import { CheckCanCommentRequest } from "../Managers/CommentManager/Requests/CheckCanCommentRequest";
import { CreateCommentRequest } from "../Managers/CommentManager/Requests/CreateCommentRequest";
import { CanCommentResponse } from "../Managers/CommentManager/Responses/CanCommentResponse";
import { CannotCommentResponse } from "../Managers/CommentManager/Responses/CannotCommentResponse";
import { CommentRejectedResponse } from "../Managers/CommentManager/Responses/CommentRejectedResponse";
import { CommentResponse } from "../Managers/CommentManager/Responses/CommentResponse";
import { ApproveItemRequest } from "../Managers/ModerationManager/Requests/ApproveItemRequest";
import { ModerationItemResponse } from "../Managers/ModerationManager/Responses/ModerationItemResponse";
import { ListNotificationsRequest } from "../Managers/NotificationManager/Requests/ListNotificationsRequest";
import { NotificationsResponse } from "../Managers/NotificationManager/Responses/NotificationsResponse";
import { CreateDraftRequest } from "../Managers/PostManager/Requests/CreateDraftRequest";
import { PublishPostRequest } from "../Managers/PostManager/Requests/PublishPostRequest";
import { PostResponse } from "../Managers/PostManager/Responses/PostResponse";
import { DependencyContainer } from "./DependencyContainer";
import { FAKE_ENV, TEST_ORIGIN } from "./FakeEnvironment.test-helper";

// Issue #23: a member mutes or blocks another member. A block stops comments on the
// blocker's posts and replies to the blocker's comments; a mute only silences the
// reply notifications. Neither is ever shown to the other member.

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
const VISITOR: Actor = { kind: "visitor" };

function idOf(actor: Actor): string {
  if (actor.kind === "visitor") {
    throw new Error("a visitor has no profile");
  }
  return actor.profile.id;
}

async function containerWithProfiles(): Promise<DependencyContainer> {
  const container = new DependencyContainer(FAKE_ENV);
  for (const actor of [THEO, JUNE, IVY, MIRA]) {
    if (actor.kind !== "member") {
      continue;
    }
    await container.accountManager.execute(
      new EnsureProfileRequest({
        userId: actor.profile.id,
        email: `${actor.profile.handle}@example.com`,
        displayName: actor.profile.displayName,
        avatarUrl: null,
      }),
    );
  }
  return container;
}

async function setLevel(
  container: DependencyContainer,
  actor: Actor,
  target: Actor,
  level: MemberBlockLevel | "none",
) {
  return container.accountManager.execute(
    new SetMemberBlockRequest(actor, idOf(target), level),
  );
}

async function publishedPostBy(
  container: DependencyContainer,
  actor: Actor,
): Promise<Post> {
  const drafted = await container.postManager.execute(
    new CreateDraftRequest(
      actor,
      {
        title: "The Cedar Planter Box",
        bodyMd: "Three weekends.",
        summary: null,
        tags: [],
        visibility: "public",
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

function createComment(
  container: DependencyContainer,
  actor: Actor,
  postId: string,
  parentId: string | null = null,
) {
  return container.commentManager.execute(
    new CreateCommentRequest(actor, { postId, parentId, bodyMd: "Nice." }, TEST_ORIGIN),
  );
}

async function comment(
  container: DependencyContainer,
  actor: Actor,
  postId: string,
  parentId: string | null = null,
): Promise<Comment> {
  const response = await createComment(container, actor, postId, parentId);
  if (!(response instanceof CommentResponse)) {
    throw new Error(`expected CommentResponse, got ${response.constructor.name}`);
  }
  return response.comment;
}

async function replyNoticesFor(container: DependencyContainer, actor: Actor) {
  const listed = await container.notificationManager.query(
    new ListNotificationsRequest(actor),
  );
  if (!(listed instanceof NotificationsResponse)) {
    throw new Error(`expected NotificationsResponse, got ${listed.constructor.name}`);
  }
  return listed.notifications.filter((n) => n.kind === "reply.created");
}

describe("DependencyContainer: member mutes and blocks (#23)", () => {
  test("a member sets, raises and takes back a level", async () => {
    const container = await containerWithProfiles();
    await expect(setLevel(container, THEO, JUNE, "mute")).resolves.toEqual(
      expect.objectContaining({ level: "mute" }),
    );
    await expect(setLevel(container, THEO, JUNE, "block")).resolves.toEqual(
      expect.objectContaining({ level: "block" }),
    );
    const cleared = await setLevel(container, THEO, JUNE, "none");
    expect(cleared).toBeInstanceOf(MemberBlockSetResponse);
    // Taking back a level that is not there is the same answer.
    await expect(setLevel(container, THEO, JUNE, "none")).resolves.toBeInstanceOf(
      MemberBlockSetResponse,
    );
  });

  test("nobody mutes themselves, a visitor mutes nobody, and the target must exist", async () => {
    const container = await containerWithProfiles();
    const self = await setLevel(container, THEO, THEO, "mute");
    expect(self).toBeInstanceOf(MemberBlockRejectedResponse);
    expect(self).toMatchObject({ reason: "self" });

    const visitor = await container.accountManager.execute(
      new SetMemberBlockRequest(VISITOR, idOf(JUNE), "mute"),
    );
    expect(visitor).toBeInstanceOf(ActionForbiddenResponse);
    expect(visitor).toMatchObject({ reason: "signed-out" });

    await expect(
      container.accountManager.execute(
        new SetMemberBlockRequest(THEO, "00000000-0000-4000-8000-0000000000ff", "block"),
      ),
    ).resolves.toBeInstanceOf(NoSuchProfileResponse);
  });

  test("a block stops comments on the blocker's post, and the form says so first", async () => {
    const container = await containerWithProfiles();
    const post = await publishedPostBy(container, THEO);
    await setLevel(container, THEO, JUNE, "block");

    const check = await container.commentManager.query(
      new CheckCanCommentRequest(JUNE, post.id),
    );
    expect(check).toBeInstanceOf(CannotCommentResponse);
    expect(check).toMatchObject({ reason: "not-allowed" });
    const refused = await createComment(container, JUNE, post.id);
    expect(refused).toBeInstanceOf(CommentRejectedResponse);
    expect(refused).toMatchObject({ reason: "blocked" });

    // Anyone else still comments, and so does June once the block is gone.
    await expect(
      container.commentManager.query(new CheckCanCommentRequest(MIRA, post.id)),
    ).resolves.toBeInstanceOf(CanCommentResponse);
    await setLevel(container, THEO, JUNE, "none");
    await expect(createComment(container, JUNE, post.id)).resolves.toBeInstanceOf(
      CommentResponse,
    );
  });

  test("a block stops replies to the blocker's comment on someone else's post", async () => {
    const container = await containerWithProfiles();
    const post = await publishedPostBy(container, MIRA);
    const root = await comment(container, THEO, post.id);
    await setLevel(container, THEO, JUNE, "block");

    // The post is Mira's, so June may still comment on it at the top level.
    await expect(
      container.commentManager.query(new CheckCanCommentRequest(JUNE, post.id)),
    ).resolves.toBeInstanceOf(CanCommentResponse);
    await expect(createComment(container, JUNE, post.id)).resolves.toBeInstanceOf(
      CommentResponse,
    );
    const reply = await createComment(container, JUNE, post.id, root.id);
    expect(reply).toMatchObject({ reason: "blocked" });
  });

  test("a mute lets the reply through but tells the muting member nothing", async () => {
    const container = await containerWithProfiles();
    const post = await publishedPostBy(container, MIRA);
    const root = await comment(container, THEO, post.id);
    await setLevel(container, THEO, JUNE, "mute");

    const reply = await comment(container, JUNE, post.id, root.id);
    expect(reply.status).toBe("visible");
    expect(await replyNoticesFor(container, THEO)).toEqual([]);

    // Unmuted, the next reply notifies again.
    await setLevel(container, THEO, JUNE, "none");
    await comment(container, JUNE, post.id, root.id);
    expect(await replyNoticesFor(container, THEO)).toHaveLength(1);
  });

  test("a muted member's pending reply, once approved, tells the muting member nothing", async () => {
    const container = await containerWithProfiles();
    const post = await publishedPostBy(container, MIRA);
    const root = await comment(container, THEO, post.id);
    await setLevel(container, THEO, IVY, "mute");

    // Ivy is on probation: her reply waits for a moderator.
    const reply = await comment(container, IVY, post.id, root.id);
    expect(reply.status).toBe("pending");
    const approved = await container.moderationManager.execute(
      new ApproveItemRequest(MIRA, { kind: "comment", id: reply.id }),
    );
    expect(approved).toBeInstanceOf(ModerationItemResponse);
    expect(await replyNoticesFor(container, THEO)).toEqual([]);
  });
});
