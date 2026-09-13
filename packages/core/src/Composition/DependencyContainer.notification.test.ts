import { describe, expect, test } from "vitest";

import type { Actor } from "../Common/Actor";
import type { Comment } from "../Common/Comment";
import type { Post } from "../Common/Post";
import type { Profile } from "../Common/Profile";
import { EnsureProfileRequest } from "../Managers/AccountManager/Requests/EnsureProfileRequest";
import { CreateCommentRequest } from "../Managers/CommentManager/Requests/CreateCommentRequest";
import { CommentResponse } from "../Managers/CommentManager/Responses/CommentResponse";
import { ApproveItemRequest } from "../Managers/ModerationManager/Requests/ApproveItemRequest";
import { FileReportRequest } from "../Managers/ModerationManager/Requests/FileReportRequest";
import { ModerationItemResponse } from "../Managers/ModerationManager/Responses/ModerationItemResponse";
import { ReportFiledResponse } from "../Managers/ModerationManager/Responses/ReportFiledResponse";
import { ListNotificationsRequest } from "../Managers/NotificationManager/Requests/ListNotificationsRequest";
import { MarkReadRequest } from "../Managers/NotificationManager/Requests/MarkReadRequest";
import { NotificationForbiddenResponse } from "../Managers/NotificationManager/Responses/NotificationForbiddenResponse";
import { NotificationsMarkedResponse } from "../Managers/NotificationManager/Responses/NotificationsMarkedResponse";
import { NotificationsResponse } from "../Managers/NotificationManager/Responses/NotificationsResponse";
import { CreateDraftRequest } from "../Managers/PostManager/Requests/CreateDraftRequest";
import { PublishPostRequest } from "../Managers/PostManager/Requests/PublishPostRequest";
import { PostResponse } from "../Managers/PostManager/Responses/PostResponse";
import { DependencyContainer } from "./DependencyContainer";
import { FAKE_ENV } from "./FakeEnvironment.test-helper";

const AT = new Date("2026-09-12T10:00:00.000Z");

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
  profile: profile({
    id: "00000000-0000-4000-8000-000000000004",
    handle: "june",
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

async function ensureProfile(
  container: DependencyContainer,
  actor: Actor,
): Promise<void> {
  if (actor.kind !== "member") {
    return;
  }
  await container.accountManager.execute(
    new EnsureProfileRequest({
      userId: actor.profile.id,
      email: `${actor.profile.handle}@example.com`,
      displayName: actor.profile.displayName,
      avatarUrl: actor.profile.avatarUrl,
    }),
  );
}

async function publishedPost(container: DependencyContainer): Promise<Post> {
  const drafted = await container.postManager.execute(
    new CreateDraftRequest(THEO, {
      title: "The Cedar Planter Box",
      bodyMd: "Three weekends.",
      summary: null,
      tags: [],
      visibility: "public",
      commentsEnabled: true,
    }),
  );
  if (!(drafted instanceof PostResponse)) {
    throw new Error(`expected PostResponse, got ${drafted.constructor.name}`);
  }
  const published = await container.postManager.execute(
    new PublishPostRequest(THEO, drafted.post.id),
  );
  if (!(published instanceof PostResponse)) {
    throw new Error(`expected PostResponse, got ${published.constructor.name}`);
  }
  return published.post;
}

async function comment(
  container: DependencyContainer,
  actor: Actor,
  postId: string,
  bodyMd: string,
  parentId: string | null = null,
): Promise<Comment> {
  const response = await container.commentManager.execute(
    new CreateCommentRequest(actor, { postId, parentId, bodyMd }),
  );
  if (!(response instanceof CommentResponse)) {
    throw new Error(`expected CommentResponse, got ${response.constructor.name}`);
  }
  return response.comment;
}

async function notificationsFor(container: DependencyContainer, actor: Actor) {
  const listed = await container.notificationManager.query(
    new ListNotificationsRequest(actor),
  );
  if (!(listed instanceof NotificationsResponse)) {
    throw new Error(`expected NotificationsResponse, got ${listed.constructor.name}`);
  }
  return listed.notifications;
}

// The issue #13 "Done when": a reply approved by a mod lights the author's bell without
// a reload, and a pending reply does not.
describe("DependencyContainer: NotificationManager", () => {
  test("a pending reply notifies nobody yet; approving it notifies the parent's author", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await publishedPost(container);
    const root = await comment(container, THEO, post.id, "Cedar holds up well.");

    // June is on probation: her reply lands pending, not visible.
    const reply = await comment(
      container,
      JUNE,
      post.id,
      "How did you seal it?",
      root.id,
    );
    expect(reply.status).toBe("pending");

    expect(await notificationsFor(container, THEO)).toEqual([]);

    const approved = await container.moderationManager.execute(
      new ApproveItemRequest(MIRA, { kind: "comment", id: reply.id }),
    );
    expect(approved).toBeInstanceOf(ModerationItemResponse);

    const notified = await notificationsFor(container, THEO);
    expect(notified).toHaveLength(1);
    expect(notified[0]).toMatchObject({
      kind: "reply.created",
      postId: post.id,
      commentId: reply.id,
      readAt: null,
    });
  });

  test("a trusted member's reply notifies the parent's author at once", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await publishedPost(container);
    const root = await comment(container, THEO, post.id, "Cedar holds up well.");

    const mira = {
      ...MIRA,
      profile: { ...MIRA.profile, trustLevel: "trusted" as const },
    };
    const reply = await comment(container, mira, post.id, "Nice work.", root.id);
    expect(reply.status).toBe("visible");

    const notified = await notificationsFor(container, THEO);
    expect(notified).toHaveLength(1);
    expect(notified[0]).toMatchObject({ kind: "reply.created", commentId: reply.id });
  });

  test("a member never notifies themself for a reply to their own comment", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await publishedPost(container);
    const root = await comment(container, THEO, post.id, "Cedar holds up well.");
    await comment(container, THEO, post.id, "Also: sand it first.", root.id);

    expect(await notificationsFor(container, THEO)).toEqual([]);
  });

  test("MarkRead scopes to the caller's own notifications and can mark one or all", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await publishedPost(container);
    const root = await comment(container, THEO, post.id, "Cedar holds up well.");
    const mira = {
      ...MIRA,
      profile: { ...MIRA.profile, trustLevel: "trusted" as const },
    };
    await comment(container, mira, post.id, "One.", root.id);
    await comment(container, mira, post.id, "Two.", root.id);

    const before = await notificationsFor(container, THEO);
    expect(before).toHaveLength(2);
    expect(before.every((n) => n.readAt === null)).toBe(true);
    const [first] = before;
    if (first === undefined) {
      throw new Error("expected at least one notification");
    }

    const markedOne = await container.notificationManager.execute(
      new MarkReadRequest(THEO, first.id),
    );
    expect(markedOne).toBeInstanceOf(NotificationsMarkedResponse);
    expect((markedOne as NotificationsMarkedResponse).count).toBe(1);

    const afterOne = await notificationsFor(container, THEO);
    expect(afterOne.filter((n) => n.readAt === null)).toHaveLength(1);

    const markedRest = await container.notificationManager.execute(
      new MarkReadRequest(THEO, null),
    );
    expect((markedRest as NotificationsMarkedResponse).count).toBe(1);
    expect(
      (await notificationsFor(container, THEO)).every((n) => n.readAt !== null),
    ).toBe(true);
  });

  test("a visitor may not list or mark notifications", async () => {
    const container = new DependencyContainer(FAKE_ENV);

    const listed = await container.notificationManager.query(
      new ListNotificationsRequest(VISITOR),
    );
    expect(listed).toBeInstanceOf(NotificationForbiddenResponse);

    const marked = await container.notificationManager.execute(
      new MarkReadRequest(VISITOR, null),
    );
    expect(marked).toBeInstanceOf(NotificationForbiddenResponse);
  });

  test("filing a report on a comment notifies staff", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    await ensureProfile(container, MIRA);
    const post = await publishedPost(container);
    const root = await comment(container, THEO, post.id, "Cedar holds up well.");

    const filed = await container.moderationManager.execute(
      new FileReportRequest(JUNE, { kind: "comment", id: root.id }, "spam", null),
    );
    expect(filed).toBeInstanceOf(ReportFiledResponse);

    const notified = await notificationsFor(container, MIRA);
    expect(notified).toHaveLength(1);
    expect(notified[0]).toMatchObject({
      kind: "report.filed",
      commentId: root.id,
      reportId: expect.any(String) as string,
    });
  });

  test("a member never notifies themself for their own pending reply approved later", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await publishedPost(container);

    // June is on probation: her own root comment lands pending too.
    const root = await comment(container, JUNE, post.id, "Cedar holds up well.");
    const approvedRoot = await container.moderationManager.execute(
      new ApproveItemRequest(MIRA, { kind: "comment", id: root.id }),
    );
    expect(approvedRoot).toBeInstanceOf(ModerationItemResponse);

    const reply = await comment(
      container,
      JUNE,
      post.id,
      "Also: sand it first.",
      root.id,
    );
    const approvedReply = await container.moderationManager.execute(
      new ApproveItemRequest(MIRA, { kind: "comment", id: reply.id }),
    );
    expect(approvedReply).toBeInstanceOf(ModerationItemResponse);

    const notified = await notificationsFor(container, JUNE);
    expect(notified.filter((n) => n.kind === "reply.created")).toEqual([]);
    expect(notified.filter((n) => n.kind === "item.approved")).toHaveLength(2);
  });
});
