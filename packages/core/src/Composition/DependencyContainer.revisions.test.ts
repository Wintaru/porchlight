import { describe, expect, test } from "vitest";

import type { Actor } from "../Common/Actor";
import type { Post } from "../Common/Post";
import type { Profile } from "../Common/Profile";
import { CreateDraftRequest } from "../Managers/PostManager/Requests/CreateDraftRequest";
import { ListPostRevisionsRequest } from "../Managers/PostManager/Requests/ListPostRevisionsRequest";
import { PublishPostRequest } from "../Managers/PostManager/Requests/PublishPostRequest";
import { UnpublishPostRequest } from "../Managers/PostManager/Requests/UnpublishPostRequest";
import { UpdateDraftRequest } from "../Managers/PostManager/Requests/UpdateDraftRequest";
import { NoSuchPostResponse } from "../Managers/PostManager/Responses/NoSuchPostResponse";
import { PostForbiddenResponse } from "../Managers/PostManager/Responses/PostForbiddenResponse";
import { PostResponse } from "../Managers/PostManager/Responses/PostResponse";
import { PostRevisionsResponse } from "../Managers/PostManager/Responses/PostRevisionsResponse";
import { DependencyContainer } from "./DependencyContainer";
import { FAKE_ENV, TEST_ORIGIN } from "./FakeEnvironment.test-helper";

// Issue #23: a post that is out keeps the version readers saw each time its words
// change. Drafts keep nothing. Only someone who may edit the post reads its history.

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
const ADMIN: Actor = {
  kind: "member",
  profile: profile({
    id: "00000000-0000-4000-8000-000000000001",
    handle: "lamplighter",
    role: "admin",
  }),
};

async function expectPost(response: Promise<unknown>): Promise<Post> {
  const resolved = await response;
  if (!(resolved instanceof PostResponse)) {
    throw new Error(`expected PostResponse, got ${String(resolved)}`);
  }
  return resolved.post;
}

function draft(container: DependencyContainer): Promise<Post> {
  return expectPost(
    container.postManager.execute(
      new CreateDraftRequest(
        THEO,
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
    ),
  );
}

function edit(container: DependencyContainer, postId: string, bodyMd: string) {
  return expectPost(
    container.postManager.execute(new UpdateDraftRequest(THEO, postId, { bodyMd })),
  );
}

async function history(container: DependencyContainer, actor: Actor, postId: string) {
  return container.postManager.query(new ListPostRevisionsRequest(actor, postId));
}

describe("DependencyContainer: post revisions (#23)", () => {
  test("a draft keeps no history; a published post keeps each version readers saw", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await draft(container);
    await edit(container, post.id, "Three weekends and a sander.");

    const before = await history(container, THEO, post.id);
    expect(before).toBeInstanceOf(PostRevisionsResponse);
    expect(before).toMatchObject({ revisions: [] });

    await expectPost(
      container.postManager.execute(new PublishPostRequest(THEO, post.id, TEST_ORIGIN)),
    );
    await edit(container, post.id, "Four weekends, as it turned out.");
    await edit(container, post.id, "Four weekends and a lot of sanding.");
    // A save that changes nothing a reader sees keeps nothing.
    await expectPost(
      container.postManager.execute(
        new UpdateDraftRequest(THEO, post.id, { commentsEnabled: false }),
      ),
    );

    const after = await history(container, THEO, post.id);
    if (!(after instanceof PostRevisionsResponse)) {
      throw new Error(`expected PostRevisionsResponse, got ${after.constructor.name}`);
    }
    expect(after.post.bodyMd).toBe("Four weekends and a lot of sanding.");
    expect(after.revisions.map((revision) => revision.bodyMd)).toEqual([
      "Four weekends, as it turned out.",
      "Three weekends and a sander.",
    ]);
  });

  test("an unpublished post starts a new history only when it goes out again", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await draft(container);
    await expectPost(
      container.postManager.execute(new PublishPostRequest(THEO, post.id, TEST_ORIGIN)),
    );
    await expectPost(
      container.postManager.execute(new UnpublishPostRequest(THEO, post.id)),
    );
    await edit(container, post.id, "Back to the drawing board.");

    await expect(history(container, THEO, post.id)).resolves.toMatchObject({
      revisions: [],
    });
  });

  test("only someone who may edit the post reads its history", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await draft(container);
    await expectPost(
      container.postManager.execute(new PublishPostRequest(THEO, post.id, TEST_ORIGIN)),
    );

    await expect(history(container, JUNE, post.id)).resolves.toBeInstanceOf(
      NoSuchPostResponse,
    );
    await expect(
      history(container, { kind: "visitor" }, post.id),
    ).resolves.toBeInstanceOf(PostForbiddenResponse);
    await expect(history(container, ADMIN, post.id)).resolves.toBeInstanceOf(
      PostRevisionsResponse,
    );
  });
});
