import { describe, expect, test } from "vitest";

import type { Actor } from "../Common/Actor";
import type { Profile } from "../Common/Profile";
import { EnsureProfileRequest } from "../Managers/AccountManager/Requests/EnsureProfileRequest";
import { ProfileResponse } from "../Managers/AccountManager/Responses/ProfileResponse";
import { CreateCommentRequest } from "../Managers/CommentManager/Requests/CreateCommentRequest";
import { RerenderCommentBodiesRequest } from "../Managers/CommentManager/Requests/RerenderCommentBodiesRequest";
import { CommentBodiesRerenderedResponse } from "../Managers/CommentManager/Responses/CommentBodiesRerenderedResponse";
import { CommentForbiddenResponse } from "../Managers/CommentManager/Responses/CommentForbiddenResponse";
import { CreateDraftRequest } from "../Managers/PostManager/Requests/CreateDraftRequest";
import { PublishPostRequest } from "../Managers/PostManager/Requests/PublishPostRequest";
import { RerenderPostBodiesRequest } from "../Managers/PostManager/Requests/RerenderPostBodiesRequest";
import { PostBodiesRerenderedResponse } from "../Managers/PostManager/Responses/PostBodiesRerenderedResponse";
import { PostResponse } from "../Managers/PostManager/Responses/PostResponse";
import { RERENDER_BODIES_PER_PRESS } from "../Common/RerenderBudget";
import { DependencyContainer } from "./DependencyContainer";
import { FAKE_ENV, TEST_ORIGIN } from "./FakeEnvironment.test-helper";

// Issue #77: after the render pipeline changes, an admin re-renders the cached HTML of
// every post and comment once. A body whose HTML already matches is not written.
async function adminAndPost(): Promise<{
  container: DependencyContainer;
  admin: Actor;
  postId: string;
}> {
  const container = new DependencyContainer(FAKE_ENV);
  const made = await container.accountManager.execute(
    new EnsureProfileRequest({
      userId: "00000000-0000-4000-8000-000000000301",
      email: "admin@example.com",
      displayName: "Admin",
      avatarUrl: null,
    }),
  );
  if (!(made instanceof ProfileResponse)) {
    throw new Error("expected the first profile");
  }
  const admin: Actor = { kind: "member", profile: made.profile };
  const drafted = await container.postManager.execute(
    new CreateDraftRequest(
      admin,
      {
        title: "Code",
        bodyMd: "```ts\nconst x = 1;\n```",
        summary: null,
        tags: [],
        visibility: "public",
        commentsEnabled: true,
      },
      TEST_ORIGIN,
    ),
  );
  if (!(drafted instanceof PostResponse)) {
    throw new Error("expected a draft");
  }
  await container.postManager.execute(
    new PublishPostRequest(admin, drafted.post.id, TEST_ORIGIN),
  );
  await container.commentManager.execute(
    new CreateCommentRequest(
      admin,
      { postId: drafted.post.id, parentId: null, bodyMd: "```sql\nselect 1;\n```" },
      TEST_ORIGIN,
    ),
  );
  return { container, admin, postId: drafted.post.id };
}

describe("DependencyContainer: re-render cached HTML (#77)", () => {
  test("bodies already rendered by the current pipeline are checked, not rewritten", async () => {
    const { container, admin } = await adminAndPost();
    const posts = await container.postManager.execute(
      new RerenderPostBodiesRequest(admin, null, RERENDER_BODIES_PER_PRESS),
    );
    const comments = await container.commentManager.execute(
      new RerenderCommentBodiesRequest(admin, null, RERENDER_BODIES_PER_PRESS),
    );
    expect(posts).toEqual(
      new PostBodiesRerenderedResponse(posts.correlationId, 1, 0, 0, null),
    );
    expect(comments).toEqual(
      new CommentBodiesRerenderedResponse(comments.correlationId, 1, 0, 0, null),
    );
  });

  test("a budget of one comment stops after it and resumes to the end (#98)", async () => {
    const { container, admin, postId } = await adminAndPost();
    await container.commentManager.execute(
      new CreateCommentRequest(
        admin,
        { postId, parentId: null, bodyMd: "A second comment." },
        TEST_ORIGIN,
      ),
    );

    const press = async (afterId: string | null) => {
      const response = await container.commentManager.execute(
        new RerenderCommentBodiesRequest(admin, afterId, 1),
      );
      if (!(response instanceof CommentBodiesRerenderedResponse)) {
        throw new Error(`expected a re-render, got ${response.constructor.name}`);
      }
      return response;
    };

    const first = await press(null);
    expect(first).toMatchObject({ checked: 1, changed: 0, skipped: 0 });
    expect(first.resumeAfterId).not.toBeNull();
    const second = await press(first.resumeAfterId);
    expect(second).toMatchObject({ checked: 1 });
    expect(second.resumeAfterId).not.toBeNull();
    // A full budget may end on the last row: the next press finds nothing and is done.
    const third = await press(second.resumeAfterId);
    expect(third).toMatchObject({ checked: 0, changed: 0, resumeAfterId: null });
  });

  test("only the admin may run it", async () => {
    const { container } = await adminAndPost();
    const member: Actor = {
      kind: "member",
      profile: {
        id: "00000000-0000-4000-8000-000000000302",
        handle: "member",
        displayName: null,
        avatarUrl: null,
        bio: null,
        role: "member",
        trustLevel: "trusted",
        status: "active",
        createdAt: new Date(),
      } satisfies Profile,
    };
    expect(
      await container.commentManager.execute(
        new RerenderCommentBodiesRequest(member, null, 1),
      ),
    ).toBeInstanceOf(CommentForbiddenResponse);
  });
});
