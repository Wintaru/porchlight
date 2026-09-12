import { describe, expect, test } from "vitest";

import type { Actor } from "../Common/Actor";
import type { Comment } from "../Common/Comment";
import type { Post } from "../Common/Post";
import type { Profile } from "../Common/Profile";
import { UnhandledRequestResponse } from "../Common/UnhandledRequestResponse";
import { EnsureProfileRequest } from "../Managers/AccountManager/Requests/EnsureProfileRequest";
import { ProfileResponse } from "../Managers/AccountManager/Responses/ProfileResponse";
import type { CommentNode } from "../Managers/CommentManager/CommentNode";
import { CheckCanCommentRequest } from "../Managers/CommentManager/Requests/CheckCanCommentRequest";
import { CreateCommentRequest } from "../Managers/CommentManager/Requests/CreateCommentRequest";
import { DeleteCommentRequest } from "../Managers/CommentManager/Requests/DeleteCommentRequest";
import { EditCommentRequest } from "../Managers/CommentManager/Requests/EditCommentRequest";
import { ListCommentsForPostRequest } from "../Managers/CommentManager/Requests/ListCommentsForPostRequest";
import { ToggleReactionRequest } from "../Managers/CommentManager/Requests/ToggleReactionRequest";
import { CanCommentResponse } from "../Managers/CommentManager/Responses/CanCommentResponse";
import { CannotCommentResponse } from "../Managers/CommentManager/Responses/CannotCommentResponse";
import { CommentDeletedResponse } from "../Managers/CommentManager/Responses/CommentDeletedResponse";
import { CommentForbiddenResponse } from "../Managers/CommentManager/Responses/CommentForbiddenResponse";
import { CommentRejectedResponse } from "../Managers/CommentManager/Responses/CommentRejectedResponse";
import { CommentResponse } from "../Managers/CommentManager/Responses/CommentResponse";
import { CommentsResponse } from "../Managers/CommentManager/Responses/CommentsResponse";
import { CommentUnavailableResponse } from "../Managers/CommentManager/Responses/CommentUnavailableResponse";
import { NoSuchCommentResponse } from "../Managers/CommentManager/Responses/NoSuchCommentResponse";
import { NoSuchReactionTargetResponse } from "../Managers/CommentManager/Responses/NoSuchReactionTargetResponse";
import { ReactionToggledResponse } from "../Managers/CommentManager/Responses/ReactionToggledResponse";
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
const ADMIN: Actor = {
  kind: "member",
  profile: profile({
    id: "00000000-0000-4000-8000-000000000001",
    handle: "lamplighter",
    role: "admin",
  }),
};
const VISITOR: Actor = { kind: "visitor" };

// A published post by Theo, with comments on unless said otherwise.
async function publishedPost(
  container: DependencyContainer,
  commentsEnabled = true,
): Promise<Post> {
  const drafted = await container.postManager.execute(
    new CreateDraftRequest(THEO, {
      title: "The Cedar Planter Box",
      bodyMd: "Three weekends.",
      summary: null,
      tags: [],
      visibility: "public",
      commentsEnabled,
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

async function tree(
  container: DependencyContainer,
  actor: Actor,
  postId: string,
): Promise<readonly CommentNode[]> {
  const response = await container.commentManager.query(
    new ListCommentsForPostRequest(actor, postId),
  );
  if (!(response instanceof CommentsResponse)) {
    throw new Error(`expected CommentsResponse, got ${response.constructor.name}`);
  }
  return response.comments;
}

// The fake profile store starts empty; the depth rule looks a handle up, so the member
// it will name has to be there.
async function seedProfile(container: DependencyContainer, actor: Actor): Promise<void> {
  if (actor.kind !== "member") {
    throw new Error("a visitor has no profile to seed");
  }
  const response = await container.accountManager.execute(
    new EnsureProfileRequest({
      userId: actor.profile.id,
      email: `${actor.profile.handle}@porchlight.local`,
      displayName: actor.profile.displayName,
      avatarUrl: null,
    }),
  );
  if (!(response instanceof ProfileResponse)) {
    throw new Error(`expected ProfileResponse, got ${response.constructor.name}`);
  }
}

// Comments flow through the real wiring with the fake stores, the real PermissionEngine
// and the real ContentRenderEngine (SPEC.md §5, D5, D9, D10, D20).
describe("DependencyContainer: CommentManager", () => {
  test("a trusted member's comment is visible at once and rendered sanitized", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await publishedPost(container);

    const stored = await comment(
      container,
      THEO,
      post.id,
      "  Pre-drilling is the **whole** game.<script>x</script>  ",
    );

    expect(stored).toMatchObject({
      postId: post.id,
      parentId: null,
      depth: 0,
      status: "visible",
      author: { kind: "member", profileId: THEO.profile.id },
      bodyMd: "Pre-drilling is the **whole** game.<script>x</script>",
      bodyHtml: "<p>Pre-drilling is the <strong>whole</strong> game.x</p>",
    });
  });

  test("a probation member's comment waits as pending and only they and an admin see it", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await publishedPost(container);

    const pending = await comment(container, JUNE, post.id, "Can I see it sometime?");
    expect(pending.status).toBe("pending");

    expect(await tree(container, VISITOR, post.id)).toEqual([]);
    expect(await tree(container, THEO, post.id)).toEqual([]);
    expect((await tree(container, JUNE, post.id)).map((n) => n.comment.id)).toEqual([
      pending.id,
    ]);
    expect((await tree(container, ADMIN, post.id)).map((n) => n.comment.id)).toEqual([
      pending.id,
    ]);
  });

  test("staff comments publish at once", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await publishedPost(container);

    expect((await comment(container, MIRA, post.id, "Read twice.")).status).toBe(
      "visible",
    );
    expect((await comment(container, ADMIN, post.id, "Light is on.")).status).toBe(
      "visible",
    );
  });

  test("a visitor is refused as signed-out and the form check says so (D20)", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await publishedPost(container);

    const created = await container.commentManager.execute(
      new CreateCommentRequest(VISITOR, {
        postId: post.id,
        parentId: null,
        bodyMd: "Hi",
      }),
    );
    expect(created).toBeInstanceOf(CommentForbiddenResponse);
    expect(created).toMatchObject({ reason: "signed-out" });

    const check = await container.commentManager.query(
      new CheckCanCommentRequest(VISITOR, post.id),
    );
    expect(check).toBeInstanceOf(CannotCommentResponse);
    expect(check).toMatchObject({ reason: "signed-out" });
    await expect(
      container.commentManager.query(new CheckCanCommentRequest(THEO, post.id)),
    ).resolves.toBeInstanceOf(CanCommentResponse);
  });

  test("a post with comments off refuses new comments and keeps the old ones (D20)", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await publishedPost(container, false);

    const created = await container.commentManager.execute(
      new CreateCommentRequest(THEO, { postId: post.id, parentId: null, bodyMd: "Hi" }),
    );
    expect(created).toBeInstanceOf(CommentForbiddenResponse);
    expect(created).toMatchObject({ reason: "comments-closed" });
    const check = await container.commentManager.query(
      new CheckCanCommentRequest(THEO, post.id),
    );
    expect(check).toMatchObject({ reason: "comments-closed" });
    await expect(
      container.commentManager.query(new ListCommentsForPostRequest(VISITOR, post.id)),
    ).resolves.toBeInstanceOf(CommentsResponse);
  });

  test("site_config.comments = off closes commenting for everyone (D20)", async () => {
    const container = new DependencyContainer({
      ...FAKE_ENV,
      SITE_CONFIG_FAKE_COMMENTS: "off",
    });
    const post = await publishedPost(container);

    for (const actor of [THEO, ADMIN]) {
      const created = await container.commentManager.execute(
        new CreateCommentRequest(actor, {
          postId: post.id,
          parentId: null,
          bodyMd: "Hi",
        }),
      );
      expect(created).toBeInstanceOf(CommentForbiddenResponse);
      expect(created).toMatchObject({ reason: "comments-closed" });
    }
  });

  test("a comment on a draft is not allowed; on a missing post it is rejected", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const drafted = await container.postManager.execute(
      new CreateDraftRequest(THEO, {
        title: "Half a thought",
        bodyMd: "",
        summary: null,
        tags: [],
        visibility: "public",
        commentsEnabled: true,
      }),
    );
    if (!(drafted instanceof PostResponse)) {
      throw new Error("draft failed");
    }

    const onDraft = await container.commentManager.execute(
      new CreateCommentRequest(THEO, {
        postId: drafted.post.id,
        parentId: null,
        bodyMd: "Hi",
      }),
    );
    expect(onDraft).toBeInstanceOf(CommentForbiddenResponse);
    expect(onDraft).toMatchObject({ reason: "not-allowed" });

    const onNothing = await container.commentManager.execute(
      new CreateCommentRequest(THEO, { postId: "nope", parentId: null, bodyMd: "Hi" }),
    );
    expect(onNothing).toBeInstanceOf(CommentRejectedResponse);
    expect(onNothing).toMatchObject({ reason: "no-such-post" });
  });

  test("a blank body and a bad parent are rejected before any write", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await publishedPost(container);
    const other = await publishedPost(container);
    const elsewhere = await comment(container, THEO, other.id, "On another post.");
    const pending = await comment(container, JUNE, post.id, "Pending.");

    const blank = await container.commentManager.execute(
      new CreateCommentRequest(THEO, {
        postId: post.id,
        parentId: null,
        bodyMd: "  \n ",
      }),
    );
    expect(blank).toBeInstanceOf(CommentRejectedResponse);
    expect(blank).toMatchObject({ reason: "empty-body" });

    for (const parentId of ["nope", elsewhere.id, pending.id]) {
      const reply = await container.commentManager.execute(
        new CreateCommentRequest(THEO, { postId: post.id, parentId, bodyMd: "Hi" }),
      );
      expect(reply).toBeInstanceOf(CommentRejectedResponse);
      expect(reply).toMatchObject({ reason: "no-such-parent" });
    }
    expect(await tree(container, VISITOR, post.id)).toEqual([]);
  });

  test("a 7-deep reply chain stops at depth 6 and the last reply names who it answers (D10)", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    await seedProfile(container, THEO);
    const post = await publishedPost(container);

    let parent = await comment(container, THEO, post.id, "depth 0");
    const chain = [parent];
    for (let depth = 1; depth <= 7; depth += 1) {
      parent = await comment(
        container,
        THEO,
        post.id,
        `depth ${String(depth)}`,
        parent.id,
      );
      chain.push(parent);
    }

    expect(chain.map((c) => c.depth)).toEqual([0, 1, 2, 3, 4, 5, 6, 6]);
    const seventh = chain[7];
    const sixth = chain[6];
    const fifth = chain[5];
    expect(seventh?.parentId).toBe(fifth?.id);
    expect(seventh?.status === "visible" && seventh.bodyMd).toBe("@theo depth 7");
    expect(seventh?.status === "visible" && seventh.bodyHtml).toBe(
      "<p>@theo depth 7</p>",
    );

    // The tree: one root, a single path down to depth 5, then two siblings at 6,
    // oldest first.
    let nodes = await tree(container, VISITOR, post.id);
    for (let depth = 0; depth <= 5; depth += 1) {
      expect(nodes).toHaveLength(1);
      expect(nodes[0]?.comment.depth).toBe(depth);
      nodes = nodes[0]?.replies ?? [];
    }
    expect(nodes.map((n) => n.comment.id)).toEqual([sixth?.id, seventh?.id]);
    expect(nodes.every((n) => n.replies.length === 0)).toBe(true);
  });

  test("deleting a comment with replies leaves a tombstone; without, it is gone (D5)", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await publishedPost(container);
    const root = await comment(container, THEO, post.id, "root");
    const reply = await comment(container, JUNE, post.id, "reply", root.id);
    const lone = await comment(container, THEO, post.id, "lone");

    const tombstoned = await container.commentManager.execute(
      new DeleteCommentRequest(THEO, root.id),
    );
    expect(tombstoned).toBeInstanceOf(CommentDeletedResponse);
    expect(tombstoned).toMatchObject({ outcome: "tombstoned" });

    const removed = await container.commentManager.execute(
      new DeleteCommentRequest(THEO, lone.id),
    );
    expect(removed).toMatchObject({ outcome: "removed" });

    const asJune = await tree(container, JUNE, post.id);
    expect(asJune).toHaveLength(1);
    expect(asJune[0]?.comment).toMatchObject({ id: root.id, status: "tombstone" });
    expect("author" in (asJune[0]?.comment ?? {})).toBe(false);
    expect(asJune[0]?.replies.map((n) => n.comment.id)).toEqual([reply.id]);

    // Nothing left to delete on a tombstone, even for an admin.
    const again = await container.commentManager.execute(
      new DeleteCommentRequest(ADMIN, root.id),
    );
    expect(again).toBeInstanceOf(CommentForbiddenResponse);
    expect(again).toMatchObject({ reason: "not-allowed" });
    await expect(
      container.commentManager.execute(new DeleteCommentRequest(THEO, lone.id)),
    ).resolves.toBeInstanceOf(NoSuchCommentResponse);
  });

  test("only the author or an admin may edit or delete; a moderator may not", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await publishedPost(container);
    const theirs = await comment(container, JUNE, post.id, "mine");

    for (const actor of [THEO, MIRA]) {
      const edited = await container.commentManager.execute(
        new EditCommentRequest(actor, theirs.id, "not yours"),
      );
      expect(edited).toBeInstanceOf(CommentForbiddenResponse);
      expect(edited).toMatchObject({ reason: "not-allowed" });
      const deleted = await container.commentManager.execute(
        new DeleteCommentRequest(actor, theirs.id),
      );
      expect(deleted).toMatchObject({ reason: "not-allowed" });
    }

    const byAuthor = await container.commentManager.execute(
      new EditCommentRequest(JUNE, theirs.id, "still *mine*"),
    );
    expect(byAuthor).toBeInstanceOf(CommentResponse);
    expect(byAuthor).toMatchObject({
      comment: {
        status: "pending",
        bodyMd: "still *mine*",
        bodyHtml: "<p>still <em>mine</em></p>",
      },
    });
    const byAdmin = await container.commentManager.execute(
      new EditCommentRequest(ADMIN, theirs.id, "tidied"),
    );
    expect(byAdmin).toMatchObject({ comment: { bodyMd: "tidied" } });
    const blank = await container.commentManager.execute(
      new EditCommentRequest(JUNE, theirs.id, " "),
    );
    expect(blank).toMatchObject({ reason: "empty-body" });
    await expect(
      container.commentManager.execute(new EditCommentRequest(JUNE, "nope", "x")),
    ).resolves.toBeInstanceOf(NoSuchCommentResponse);
  });

  test("a reaction toggles on and off, once per member per kind (D9)", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await publishedPost(container);
    const target = { kind: "post", id: post.id } as const;

    const on = await container.commentManager.execute(
      new ToggleReactionRequest(JUNE, target, "heart"),
    );
    expect(on).toBeInstanceOf(ReactionToggledResponse);
    expect(on).toMatchObject({ target, kind: "heart", reacted: true });
    const off = await container.commentManager.execute(
      new ToggleReactionRequest(JUNE, target, "heart"),
    );
    expect(off).toMatchObject({ reacted: false });
    // A different kind is its own toggle.
    const clap = await container.commentManager.execute(
      new ToggleReactionRequest(JUNE, target, "clap"),
    );
    expect(clap).toMatchObject({ kind: "clap", reacted: true });
  });

  test("reactions land only on published posts and visible comments, by members", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await publishedPost(container);
    const visible = await comment(container, THEO, post.id, "visible");
    const pending = await comment(container, JUNE, post.id, "pending");

    const onComment = await container.commentManager.execute(
      new ToggleReactionRequest(THEO, { kind: "comment", id: visible.id }, "laugh"),
    );
    expect(onComment).toMatchObject({ reacted: true });

    const onPending = await container.commentManager.execute(
      new ToggleReactionRequest(THEO, { kind: "comment", id: pending.id }, "laugh"),
    );
    expect(onPending).toBeInstanceOf(CommentForbiddenResponse);
    expect(onPending).toMatchObject({ reason: "not-allowed" });

    const byVisitor = await container.commentManager.execute(
      new ToggleReactionRequest(VISITOR, { kind: "post", id: post.id }, "heart"),
    );
    expect(byVisitor).toMatchObject({ reason: "signed-out" });

    await expect(
      container.commentManager.execute(
        new ToggleReactionRequest(THEO, { kind: "comment", id: "nope" }, "heart"),
      ),
    ).resolves.toBeInstanceOf(NoSuchReactionTargetResponse);
    await expect(
      container.commentManager.execute(
        new ToggleReactionRequest(THEO, { kind: "post", id: "nope" }, "heart"),
      ),
    ).resolves.toBeInstanceOf(NoSuchReactionTargetResponse);
  });

  test("the tree lists roots and replies oldest first", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await publishedPost(container);
    const first = await comment(container, THEO, post.id, "first");
    const second = await comment(container, THEO, post.id, "second");
    const replyB = await comment(container, THEO, post.id, "reply b", first.id);
    const replyA = await comment(container, THEO, post.id, "reply a", first.id);

    const nodes = await tree(container, VISITOR, post.id);
    expect(nodes.map((n) => n.comment.id)).toEqual([first.id, second.id]);
    expect(nodes[0]?.replies.map((n) => n.comment.id)).toEqual([replyB.id, replyA.id]);
  });

  test("a failing comment store answers CommentUnavailable with the reason", async () => {
    const container = new DependencyContainer({
      ...FAKE_ENV,
      COMMENT_FAKE_RESULT: "fail",
    });
    const post = await publishedPost(container);

    const created = await container.commentManager.execute(
      new CreateCommentRequest(THEO, { postId: post.id, parentId: null, bodyMd: "Hi" }),
    );
    expect(created).toBeInstanceOf(CommentUnavailableResponse);
    expect(created).toMatchObject({ reason: "COMMENT_FAKE_RESULT=fail" });
  });

  test("a failing reaction store answers CommentUnavailable with the reason", async () => {
    const container = new DependencyContainer({
      ...FAKE_ENV,
      REACTION_FAKE_RESULT: "fail",
    });
    const post = await publishedPost(container);

    const toggled = await container.commentManager.execute(
      new ToggleReactionRequest(THEO, { kind: "post", id: post.id }, "heart"),
    );
    expect(toggled).toBeInstanceOf(CommentUnavailableResponse);
    expect(toggled).toMatchObject({ reason: "REACTION_FAKE_RESULT=fail" });
  });

  test("a request on the wrong method is unhandled", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    await expect(
      container.commentManager.query(
        new CreateCommentRequest(THEO, { postId: "p", parentId: null, bodyMd: "x" }),
      ),
    ).resolves.toBeInstanceOf(UnhandledRequestResponse);
  });

  test("an unknown comment policy in the fake fails at construction", () => {
    expect(
      () =>
        new DependencyContainer({ ...FAKE_ENV, SITE_CONFIG_FAKE_COMMENTS: "everyone" }),
    ).toThrow("SITE_CONFIG_FAKE_COMMENTS=everyone is not a comment policy");
  });
});
