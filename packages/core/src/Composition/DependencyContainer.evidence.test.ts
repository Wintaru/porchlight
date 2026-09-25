import { afterEach, describe, expect, test, vi } from "vitest";

import type { Actor } from "../Common/Actor";
import type { Profile } from "../Common/Profile";
import { CreateAnonymousCommentRequest } from "../Managers/CommentManager/Requests/CreateAnonymousCommentRequest";
import { CreateCommentRequest } from "../Managers/CommentManager/Requests/CreateCommentRequest";
import { AnonymousCommentCreatedResponse } from "../Managers/CommentManager/Responses/AnonymousCommentCreatedResponse";
import { CommentResponse } from "../Managers/CommentManager/Responses/CommentResponse";
import { CreateAnonymousPostRequest } from "../Managers/PostManager/Requests/CreateAnonymousPostRequest";
import { CreateDraftRequest } from "../Managers/PostManager/Requests/CreateDraftRequest";
import { PublishPostRequest } from "../Managers/PostManager/Requests/PublishPostRequest";
import { AnonymousPostCreatedResponse } from "../Managers/PostManager/Responses/AnonymousPostCreatedResponse";
import { PostResponse } from "../Managers/PostManager/Responses/PostResponse";
import { DependencyContainer } from "./DependencyContainer";
import { FAKE_ENV, TEST_ORIGIN } from "./FakeEnvironment.test-helper";

const THEO_PROFILE: Profile = {
  id: "00000000-0000-4000-8000-000000000003",
  handle: "theo",
  displayName: "Theo",
  avatarUrl: null,
  bio: null,
  role: "member",
  trustLevel: "trusted",
  status: "active",
  createdAt: new Date("2026-09-12T10:00:00.000Z"),
};
const THEO: Actor = { kind: "member", profile: THEO_PROFILE };
const VISITOR: Actor = { kind: "visitor" };
const SUBMISSION = {
  secret: undefined,
  turnstileToken: undefined,
  clientIp: "203.0.113.9",
  userAgent: "test-agent",
} as const;

afterEach(() => {
  vi.restoreAllMocks();
});

// The row's fields are TransformRecordTextEvidenceHandler's test. This one shows that
// every way to create a post or a comment reaches the engine, and that a failed
// evidence write is logged without failing the item that is already stored.
describe("DependencyContainer: evidence for posts and comments (#61)", () => {
  test("all four creates record evidence, and a failed record keeps the item", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const container = new DependencyContainer({
      ...FAKE_ENV,
      EVIDENCE_FAKE_RESULT: "fail",
    });

    const drafted = await container.postManager.execute(
      new CreateDraftRequest(
        THEO,
        {
          title: "Evidence",
          bodyMd: "A body.",
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
    await container.postManager.execute(new PublishPostRequest(THEO, drafted.post.id));

    const anonymousPost = await container.postManager.execute(
      new CreateAnonymousPostRequest(
        VISITOR,
        { title: "Anonymous", bodyMd: "A note.", summary: null },
        SUBMISSION,
      ),
    );
    const comment = await container.commentManager.execute(
      new CreateCommentRequest(
        THEO,
        { postId: drafted.post.id, parentId: null, bodyMd: "A comment." },
        TEST_ORIGIN,
      ),
    );
    const anonymousComment = await container.commentManager.execute(
      new CreateAnonymousCommentRequest(
        VISITOR,
        { postId: drafted.post.id, parentId: null, bodyMd: "An anonymous comment." },
        SUBMISSION,
      ),
    );

    if (
      !(anonymousPost instanceof AnonymousPostCreatedResponse) ||
      !(comment instanceof CommentResponse) ||
      !(anonymousComment instanceof AnonymousCommentCreatedResponse)
    ) {
      throw new Error("expected every create to succeed");
    }
    const messages = logged.mock.calls.map(([message]) => String(message));
    expect(messages).toEqual([
      expect.stringContaining(`evidence for post ${drafted.post.id} not recorded`),
      expect.stringContaining(`evidence for post ${anonymousPost.post.id} not recorded`),
      expect.stringContaining(`evidence for comment ${comment.comment.id} not recorded`),
      expect.stringContaining(
        `evidence for comment ${anonymousComment.comment.id} not recorded`,
      ),
    ]);
  });

  test("with the store up, nothing is logged", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const container = new DependencyContainer(FAKE_ENV);
    await container.postManager.execute(
      new CreateAnonymousPostRequest(
        VISITOR,
        { title: "Anonymous", bodyMd: "A note.", summary: null },
        SUBMISSION,
      ),
    );
    expect(logged).not.toHaveBeenCalled();
  });
});
