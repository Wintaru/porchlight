import { describe, expect, test } from "vitest";

import type { Actor } from "../Common/Actor";
import type { PostVisibility } from "../Common/PostVisibility";
import type { Profile } from "../Common/Profile";
import { EnsureProfileRequest } from "../Managers/AccountManager/Requests/EnsureProfileRequest";
import { FollowRequest } from "../Managers/AccountManager/Requests/FollowRequest";
import { CreateCommentRequest } from "../Managers/CommentManager/Requests/CreateCommentRequest";
import { ToggleReactionRequest } from "../Managers/CommentManager/Requests/ToggleReactionRequest";
import { CommentResponse } from "../Managers/CommentManager/Responses/CommentResponse";
import { ReactionToggledResponse } from "../Managers/CommentManager/Responses/ReactionToggledResponse";
import { DismissReportsRequest } from "../Managers/ModerationManager/Requests/DismissReportsRequest";
import { FileReportRequest } from "../Managers/ModerationManager/Requests/FileReportRequest";
import { HideItemRequest } from "../Managers/ModerationManager/Requests/HideItemRequest";
import { ListQueueRequest } from "../Managers/ModerationManager/Requests/ListQueueRequest";
import { ListReportedItemsRequest } from "../Managers/ModerationManager/Requests/ListReportedItemsRequest";
import { ModerationForbiddenResponse } from "../Managers/ModerationManager/Responses/ModerationForbiddenResponse";
import { QueueResponse } from "../Managers/ModerationManager/Responses/QueueResponse";
import { ReportedItemsResponse } from "../Managers/ModerationManager/Responses/ReportedItemsResponse";
import { ListNotificationsRequest } from "../Managers/NotificationManager/Requests/ListNotificationsRequest";
import { NotificationsResponse } from "../Managers/NotificationManager/Responses/NotificationsResponse";
import { CreateDraftRequest } from "../Managers/PostManager/Requests/CreateDraftRequest";
import { GetPostRequest } from "../Managers/PostManager/Requests/GetPostRequest";
import { ListPostsForAuthorRequest } from "../Managers/PostManager/Requests/ListPostsForAuthorRequest";
import { PublishPostRequest } from "../Managers/PostManager/Requests/PublishPostRequest";
import { UpdateDraftRequest } from "../Managers/PostManager/Requests/UpdateDraftRequest";
import { NoSuchPostResponse } from "../Managers/PostManager/Responses/NoSuchPostResponse";
import { PostForbiddenResponse } from "../Managers/PostManager/Responses/PostForbiddenResponse";
import { PostRejectedResponse } from "../Managers/PostManager/Responses/PostRejectedResponse";
import { PostResponse } from "../Managers/PostManager/Responses/PostResponse";
import { PostsResponse } from "../Managers/PostManager/Responses/PostsResponse";
import { DependencyContainer } from "./DependencyContainer";
import { FAKE_ENV, TEST_ORIGIN } from "./FakeEnvironment.test-helper";

// Issue #101 (D27): a private post is its author's alone, and private is never a way
// around moderation.

const AT = new Date("2026-09-28T10:00:00.000Z");

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
const LAMP: Actor = {
  kind: "member",
  profile: profile({
    id: "00000000-0000-4000-8000-000000000001",
    handle: "lamplighter",
    role: "admin",
  }),
};
const THEO_AUTHOR = {
  kind: "author",
  profileId: "00000000-0000-4000-8000-000000000003",
} as const;

async function withProfiles(): Promise<DependencyContainer> {
  // The stored profiles are members; the admin address makes Lamplighter's an admin,
  // so the queue's staff notices have a recipient.
  const container = new DependencyContainer({
    ...FAKE_ENV,
    PORCHLIGHT_ADMIN_EMAIL: "lamplighter@example.com",
  });
  for (const actor of [THEO, JUNE, IVY, MIRA, LAMP]) {
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

async function draft(
  container: DependencyContainer,
  actor: Actor,
  visibility: PostVisibility,
) {
  const drafted = await container.postManager.execute(
    new CreateDraftRequest(
      actor,
      {
        title: `A journal entry ${String(Math.random())}`,
        bodyMd: "Words for me.",
        summary: null,
        tags: ["hiking"],
        visibility,
        commentsEnabled: true,
      },
      TEST_ORIGIN,
    ),
  );
  if (!(drafted instanceof PostResponse)) {
    throw new Error(`expected PostResponse, got ${drafted.constructor.name}`);
  }
  return drafted.post;
}

async function publish(
  container: DependencyContainer,
  actor: Actor,
  visibility: PostVisibility,
) {
  const drafted = await draft(container, actor, visibility);
  const published = await container.postManager.execute(
    new PublishPostRequest(actor, drafted.id, TEST_ORIGIN),
  );
  if (!(published instanceof PostResponse)) {
    throw new Error(`expected PostResponse, got ${published.constructor.name}`);
  }
  return published.post;
}

async function setVisibility(
  container: DependencyContainer,
  actor: Actor,
  postId: string,
  visibility: PostVisibility,
) {
  return container.postManager.execute(
    new UpdateDraftRequest(
      actor,
      postId,
      { visibility },
      undefined,
      undefined,
      TEST_ORIGIN,
    ),
  );
}

async function noticesOf(container: DependencyContainer, actor: Actor, kind: string) {
  const listed = await container.notificationManager.query(
    new ListNotificationsRequest(actor),
  );
  if (!(listed instanceof NotificationsResponse)) {
    throw new Error(`expected NotificationsResponse, got ${listed.constructor.name}`);
  }
  return listed.notifications
    .filter((notification) => notification.kind === kind)
    .map((notification) => notification.postId);
}

async function queuedPostIds(container: DependencyContainer) {
  const queue = await container.moderationManager.query(
    new ListQueueRequest(MIRA, "all"),
  );
  if (!(queue instanceof QueueResponse)) {
    throw new Error(`expected QueueResponse, got ${queue.constructor.name}`);
  }
  return queue.items.flatMap((item) => (item.kind === "post" ? [item.post.id] : []));
}

describe("DependencyContainer: private posts (#101, D27)", () => {
  test("a probation member's private post goes up at once and never reaches the queue", async () => {
    const container = await withProfiles();
    const post = await publish(container, IVY, "private");

    expect(post.status).toBe("published");
    expect(await queuedPostIds(container)).not.toContain(post.id);
    expect(await noticesOf(container, LAMP, "queue.pending")).toEqual([]);
  });

  test("switching it to public goes through the queue, like a new post", async () => {
    const container = await withProfiles();
    const post = await publish(container, IVY, "private");

    const switched = await setVisibility(container, IVY, post.id, "public");
    expect(switched).toBeInstanceOf(PostResponse);
    expect(switched).toMatchObject({
      post: { status: "pending", visibility: "public", publishedAt: null },
    });
    expect(await queuedPostIds(container)).toContain(post.id);
    expect(await noticesOf(container, LAMP, "queue.pending")).toEqual([post.id]);
  });

  test("a post waiting in the queue that turns private leaves it and is up for its author", async () => {
    const container = await withProfiles();
    const post = await publish(container, IVY, "public");
    expect(post.status).toBe("pending");

    const switched = await setVisibility(container, IVY, post.id, "private");
    expect(switched).toMatchObject({
      post: { status: "published", visibility: "private" },
    });
    expect(await queuedPostIds(container)).not.toContain(post.id);
  });

  test("a trusted member's switch to public tells followers once, however often it moves", async () => {
    const container = await withProfiles();
    await container.accountManager.execute(new FollowRequest(JUNE, THEO_AUTHOR));
    const post = await publish(container, THEO, "private");
    expect(await noticesOf(container, JUNE, "post.published")).toEqual([]);

    const switched = await setVisibility(container, THEO, post.id, "public");
    expect(switched).toMatchObject({
      post: { status: "published", visibility: "public", publishedAt: AT_ANY },
    });
    expect(await noticesOf(container, JUNE, "post.published")).toEqual([post.id]);

    await setVisibility(container, THEO, post.id, "private");
    await setVisibility(container, THEO, post.id, "unlisted");
    await setVisibility(container, THEO, post.id, "public");
    expect(await noticesOf(container, JUNE, "post.published")).toEqual([post.id]);
  });

  test("nobody but the author reads it, staff included", async () => {
    const container = await withProfiles();
    const post = await publish(container, THEO, "private");

    for (const actor of [{ kind: "visitor" } as const, JUNE, MIRA, LAMP]) {
      const read = await container.postManager.query(
        new GetPostRequest(actor, { by: "id", id: post.id }),
      );
      expect(read).toBeInstanceOf(NoSuchPostResponse);
    }
    const own = await container.postManager.query(
      new GetPostRequest(THEO, { by: "id", id: post.id }),
    );
    expect(own).toBeInstanceOf(PostResponse);

    // An admin lists a member's posts, never the private ones.
    const listed = async (actor: Actor) => {
      const response = await container.postManager.query(
        new ListPostsForAuthorRequest(actor, THEO_AUTHOR.profileId),
      );
      if (!(response instanceof PostsResponse)) {
        throw new Error(`expected PostsResponse, got ${response.constructor.name}`);
      }
      return response.posts.map((listedPost) => listedPost.id);
    };
    expect(await listed(THEO)).toContain(post.id);
    expect(await listed(LAMP)).not.toContain(post.id);
  });

  test("nobody comments, reacts, reports or moderates on it, and only its author edits it", async () => {
    const container = await withProfiles();
    const post = await publish(container, THEO, "private");

    for (const actor of [THEO, JUNE]) {
      const comment = await container.commentManager.execute(
        new CreateCommentRequest(
          actor,
          { postId: post.id, parentId: null, bodyMd: "Hello." },
          TEST_ORIGIN,
        ),
      );
      expect(comment).not.toBeInstanceOf(CommentResponse);
      const reaction = await container.commentManager.execute(
        new ToggleReactionRequest(actor, { kind: "post", id: post.id }, "heart"),
      );
      expect(reaction).not.toBeInstanceOf(ReactionToggledResponse);
    }
    const report = await container.moderationManager.execute(
      new FileReportRequest(JUNE, { kind: "post", id: post.id }, "spam", null, undefined),
    );
    expect(report).toBeInstanceOf(ModerationForbiddenResponse);
    for (const staff of [MIRA, LAMP]) {
      const hidden = await container.moderationManager.execute(
        new HideItemRequest(staff, { kind: "post", id: post.id }, "a guessed id"),
      );
      expect(hidden).toBeInstanceOf(ModerationForbiddenResponse);
    }

    const adminEdit = await container.postManager.execute(
      new UpdateDraftRequest(LAMP, post.id, { title: "Mine now" }),
    );
    expect(adminEdit).toBeInstanceOf(PostForbiddenResponse);
  });

  test("an admin may not make another member's post private", async () => {
    const container = await withProfiles();
    const post = await publish(container, THEO, "public");

    const refused = await setVisibility(container, LAMP, post.id, "private");
    expect(refused).toBeInstanceOf(PostForbiddenResponse);
  });

  test("a post with an undecided report cannot turn private until a moderator decides", async () => {
    const container = await withProfiles();
    const post = await publish(container, THEO, "public");
    await container.moderationManager.execute(
      new FileReportRequest(JUNE, { kind: "post", id: post.id }, "spam", null, undefined),
    );

    const refused = await setVisibility(container, THEO, post.id, "private");
    expect(refused).toBeInstanceOf(PostRejectedResponse);
    expect(refused).toMatchObject({ reason: "reported" });
    expect(await reportedPostIds(container)).toContain(post.id);

    await container.moderationManager.execute(
      new DismissReportsRequest(MIRA, { kind: "post", id: post.id }, null),
    );
    const switched = await setVisibility(container, THEO, post.id, "private");
    expect(switched).toMatchObject({ post: { visibility: "private" } });
  });

  test("a reported comment on a post that turns private drops out of the reports list", async () => {
    const container = await withProfiles();
    const post = await publish(container, THEO, "public");
    const comment = await container.commentManager.execute(
      new CreateCommentRequest(
        JUNE,
        { postId: post.id, parentId: null, bodyMd: "A reply." },
        TEST_ORIGIN,
      ),
    );
    if (!(comment instanceof CommentResponse)) {
      throw new Error(`expected CommentResponse, got ${comment.constructor.name}`);
    }
    await container.moderationManager.execute(
      new FileReportRequest(
        LAMP,
        { kind: "comment", id: comment.comment.id },
        "spam",
        null,
        undefined,
      ),
    );
    expect(await reportedCommentIds(container)).toContain(comment.comment.id);

    await setVisibility(container, THEO, post.id, "private");
    expect(await reportedCommentIds(container)).not.toContain(comment.comment.id);
  });

  test("an autosave may not take a private post public: that is a publish", async () => {
    const container = await withProfiles();
    const post = await publish(container, THEO, "private");
    const refused = await container.postManager.execute(
      new UpdateDraftRequest(THEO, post.id, { visibility: "public" }),
    );
    expect(refused).toMatchObject({ reason: "visibility" });
  });
});

async function reportedItems(container: DependencyContainer) {
  const listed = await container.moderationManager.query(
    new ListReportedItemsRequest(MIRA),
  );
  if (!(listed instanceof ReportedItemsResponse)) {
    throw new Error(`expected ReportedItemsResponse, got ${listed.constructor.name}`);
  }
  return listed.items;
}

async function reportedPostIds(container: DependencyContainer) {
  return (await reportedItems(container)).flatMap((item) =>
    item.kind === "post" ? [item.post.id] : [],
  );
}

async function reportedCommentIds(container: DependencyContainer) {
  return (await reportedItems(container)).flatMap((item) =>
    item.kind === "comment" ? [item.comment.id] : [],
  );
}

// Any date: the switch stamps the request's own time.
const AT_ANY = expect.any(Date) as unknown;
