import { MediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/MediaAssetAccessor";
import { describe, expect, test } from "vitest";

import { NotificationAccessor } from "../../../Accessors/NotificationAccessor/NotificationAccessor";
import { FakePostState } from "../../../Accessors/PostAccessor/FakePostState";
import { FakeLoadPostByIdHandler } from "../../../Accessors/PostAccessor/Handlers/FakeLoadPostByIdHandler";
import { FakeStorePostChangesHandler } from "../../../Accessors/PostAccessor/Handlers/FakeStorePostChangesHandler";
import { PostAccessor } from "../../../Accessors/PostAccessor/PostAccessor";
import { LoadPostByIdRequest } from "../../../Accessors/PostAccessor/Requests/LoadPostByIdRequest";
import { StorePostChangesRequest } from "../../../Accessors/PostAccessor/Requests/StorePostChangesRequest";
import { ProfileAccessor } from "../../../Accessors/ProfileAccessor/ProfileAccessor";
import { RateLimitAccessor } from "../../../Accessors/RateLimitAccessor/RateLimitAccessor";
import { FakeSiteConfigState } from "../../../Accessors/SiteConfigAccessor/FakeSiteConfigState";
import { FakeLoadPostingPolicyHandler } from "../../../Accessors/SiteConfigAccessor/Handlers/FakeLoadPostingPolicyHandler";
import { LoadPostingPolicyRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadPostingPolicyRequest";
import { SiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/SiteConfigAccessor";
import type { Actor } from "../../../Common/Actor";
import { HandlerResolverBuilder } from "../../../Common/HandlerResolverBuilder";
import type { Post } from "../../../Common/Post";
import type { PostStatus } from "../../../Common/PostStatus";
import { createAgentGuardEngine } from "../../../Composition/createAgentGuardEngine";
import { createPermissionEngine } from "../../../Composition/createPermissionEngine";
import { PublishPostRequest } from "../Requests/PublishPostRequest";
import { UnpublishPostRequest } from "../Requests/UnpublishPostRequest";
import { PostNotPublishableResponse } from "../Responses/PostNotPublishableResponse";
import { PostResponse } from "../Responses/PostResponse";
import { PublishPostHandler } from "./PublishPostHandler";
import { FollowersNotifiedResponse } from "../../../Engines/FollowerNoticeEngine/Responses/FollowersNotifiedResponse";
import { NotifyFollowersRequest } from "../../../Engines/FollowerNoticeEngine/Requests/NotifyFollowersRequest";
import { UnpublishPostHandler } from "./UnpublishPostHandler";
import { TEST_ORIGIN } from "../../../Composition/FakeEnvironment.test-helper";
import { TextEvidenceRecordedResponse } from "../../../Engines/EvidenceEngine/Responses/TextEvidenceRecordedResponse";
import { RecordTextEvidenceRequest } from "../../../Engines/EvidenceEngine/Requests/RecordTextEvidenceRequest";
import { FakeProfileState } from "../../../Accessors/ProfileAccessor/FakeProfileState";
import { FakeListStaffProfilesHandler } from "../../../Accessors/ProfileAccessor/Handlers/FakeListStaffProfilesHandler";
import { ListStaffProfilesRequest } from "../../../Accessors/ProfileAccessor/Requests/ListStaffProfilesRequest";

const AT = new Date("2026-09-12T10:00:00.000Z");
const THEO: Actor = {
  kind: "member",
  profile: {
    id: "u-theo",
    handle: "theo",
    displayName: null,
    avatarUrl: null,
    bio: null,
    role: "member",
    trustLevel: "trusted",
    status: "active",
    createdAt: AT,
  },
};

// A post in a status only a moderator can put it in (#11): the fake store holds it
// directly, since no Manager path creates it yet.
function stateWith(status: PostStatus): FakePostState {
  const state = new FakePostState();
  const post: Post = {
    id: "p1",
    author: { kind: "member", profileId: "u-theo" },
    slug: "p1",
    title: "P1",
    bodyMd: "",
    bodyHtml: "",
    summary: null,
    coverMediaId: null,
    status,
    visibility: "public",
    commentsEnabled: true,
    rejectionReason: null,
    origin: "editor",
    agentTokenId: null,
    reviewedAt: null,
    agentDraftMd: null,
    tags: [],
    publishedAt: status === "published" ? AT : null,
    createdAt: AT,
    updatedAt: AT,
    version: 1,
  };
  state.posts.set(post.id, post);
  return state;
}

function wire(
  state: FakePostState,
  noticed: string[] = [],
  recorded: RecordTextEvidenceRequest[] = [],
) {
  const posts = new PostAccessor(
    new HandlerResolverBuilder()
      .register(StorePostChangesRequest, new FakeStorePostChangesHandler(state))
      .build(),
    new HandlerResolverBuilder()
      .register(LoadPostByIdRequest, new FakeLoadPostByIdHandler(state))
      .build(),
    new HandlerResolverBuilder().build(),
  );
  const siteConfig = new SiteConfigAccessor(
    new HandlerResolverBuilder().build(),
    new HandlerResolverBuilder()
      .register(
        LoadPostingPolicyRequest,
        new FakeLoadPostingPolicyHandler(new FakeSiteConfigState("anyone", "anyone")),
      )
      .build(),
  );
  const permissions = createPermissionEngine(siteConfig);
  // No test here publishes as an agent, the only actor the guard counts, so its
  // stores stay empty.
  const agentGuard = createAgentGuardEngine(
    siteConfig,
    new RateLimitAccessor(new HandlerResolverBuilder().build()),
  );
  // The staff list for a draft-to-pending transition: nobody, so no notice is written
  // and the notification store stays empty.
  const profiles = new ProfileAccessor(
    new HandlerResolverBuilder().build(),
    new HandlerResolverBuilder()
      .register(
        ListStaffProfilesRequest,
        new FakeListStaffProfilesHandler(new FakeProfileState()),
      )
      .build(),
  );
  const notifications = new NotificationAccessor(
    new HandlerResolverBuilder().build(),
    new HandlerResolverBuilder().build(),
  );
  return {
    publish: new PublishPostHandler(
      posts,
      profiles,
      notifications,
      permissions,
      agentGuard,
      // No post here has a cover, so the cover lookup never runs.
      new MediaAssetAccessor(
        new HandlerResolverBuilder().build(),
        new HandlerResolverBuilder().build(),
        new HandlerResolverBuilder().build(),
      ),
      // Nobody follows anyone here: the fan-out is DependencyContainer.follow.test.ts's.
      // `noticed` keeps the id of each post the handler asked about.
      {
        transform: (request) => {
          if (request instanceof NotifyFollowersRequest) {
            noticed.push(request.post.id);
          }
          return Promise.resolve(new FollowersNotifiedResponse(request.correlationId, 0));
        },
      },
      // `recorded` keeps each evidence request the handler made.
      {
        transform: (request) => {
          if (request instanceof RecordTextEvidenceRequest) {
            recorded.push(request);
          }
          return Promise.resolve(new TextEvidenceRecordedResponse(request.correlationId));
        },
      },
    ),
    unpublish: new UnpublishPostHandler(posts, permissions),
  };
}

const TAKEN_DOWN: readonly PostStatus[] = ["rejected", "hidden", "removed"];

describe("Publish and Unpublish on a post a moderator acted on", () => {
  test.each(TAKEN_DOWN)("publish of a %s post is NotPublishable", async (status) => {
    const { publish } = wire(stateWith(status));

    const response = await publish.handle(
      new PublishPostRequest(THEO, "p1", TEST_ORIGIN),
    );

    expect(response).toBeInstanceOf(PostNotPublishableResponse);
    expect(response).toMatchObject({ status });
  });

  test.each(TAKEN_DOWN)("unpublish of a %s post is NotPublishable", async (status) => {
    const { unpublish } = wire(stateWith(status));

    const response = await unpublish.handle(new UnpublishPostRequest(THEO, "p1"));

    expect(response).toBeInstanceOf(PostNotPublishableResponse);
    expect(response).toMatchObject({ status });
  });

  test("unpublish of a published post is the author's to do", async () => {
    const { unpublish } = wire(stateWith("published"));

    const response = await unpublish.handle(new UnpublishPostRequest(THEO, "p1"));

    expect(response).toBeInstanceOf(PostResponse);
    expect(response).toMatchObject({ post: { status: "draft", publishedAt: null } });
  });
});

// #87: a publish can stop after the post is out and before the notice. The retry finds
// the post published and must still ask; the store's one-time claim keeps it to once.
describe("Publish of a post that is already out", () => {
  test("asks for the follower notice again", async () => {
    const noticed: string[] = [];
    const { publish } = wire(stateWith("published"), noticed);

    const response = await publish.handle(
      new PublishPostRequest(THEO, "p1", TEST_ORIGIN),
    );

    expect(response).toBeInstanceOf(PostResponse);
    expect(noticed).toEqual(["p1"]);
  });

  test("of a pending post does not", async () => {
    const noticed: string[] = [];
    const { publish } = wire(stateWith("pending"), noticed);

    await publish.handle(new PublishPostRequest(THEO, "p1", TEST_ORIGIN));

    expect(noticed).toEqual([]);
  });
});

// #65: a probation member's publish goes to pending, and the text that waits for a
// moderator is recorded as evidence, the same as a trusted member's publish.
describe("Publish by a member on probation", () => {
  test("sends the post to pending and records its text as evidence", async () => {
    const june: Actor = {
      kind: "member",
      profile: {
        id: "u-june",
        handle: "june",
        displayName: null,
        avatarUrl: null,
        bio: null,
        role: "member",
        trustLevel: "probation",
        status: "active",
        createdAt: AT,
      },
    };
    const state = stateWith("draft");
    const draft = state.posts.get("p1");
    if (draft === undefined) {
      throw new Error("expected the draft in the fake store");
    }
    state.posts.set("p1", {
      ...draft,
      author: { kind: "member", profileId: "u-june" },
      bodyMd: "Waits for a moderator.",
    });
    const recorded: RecordTextEvidenceRequest[] = [];
    const { publish } = wire(state, [], recorded);

    const response = await publish.handle(
      new PublishPostRequest(june, "p1", TEST_ORIGIN),
    );

    expect(response).toBeInstanceOf(PostResponse);
    expect(response).toMatchObject({ post: { status: "pending", publishedAt: null } });
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({
      subject: { kind: "post", id: "p1" },
      author: { kind: "member", profileId: "u-june" },
      origin: TEST_ORIGIN,
    });
    expect(recorded[0]?.text).toContain("Waits for a moderator.");
  });
});
