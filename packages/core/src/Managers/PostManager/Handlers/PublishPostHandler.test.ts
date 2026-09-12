import { describe, expect, test } from "vitest";

import { FakePostState } from "../../../Accessors/PostAccessor/FakePostState";
import { FakeLoadPostByIdHandler } from "../../../Accessors/PostAccessor/Handlers/FakeLoadPostByIdHandler";
import { FakeStorePostChangesHandler } from "../../../Accessors/PostAccessor/Handlers/FakeStorePostChangesHandler";
import { PostAccessor } from "../../../Accessors/PostAccessor/PostAccessor";
import { LoadPostByIdRequest } from "../../../Accessors/PostAccessor/Requests/LoadPostByIdRequest";
import { StorePostChangesRequest } from "../../../Accessors/PostAccessor/Requests/StorePostChangesRequest";
import { FakeSiteConfigState } from "../../../Accessors/SiteConfigAccessor/FakeSiteConfigState";
import { FakeLoadPostingPolicyHandler } from "../../../Accessors/SiteConfigAccessor/Handlers/FakeLoadPostingPolicyHandler";
import { LoadPostingPolicyRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadPostingPolicyRequest";
import { SiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/SiteConfigAccessor";
import type { Actor } from "../../../Common/Actor";
import { HandlerResolverBuilder } from "../../../Common/HandlerResolverBuilder";
import type { Post } from "../../../Common/Post";
import type { PostStatus } from "../../../Common/PostStatus";
import { createPermissionEngine } from "../../../Composition/createPermissionEngine";
import { PublishPostRequest } from "../Requests/PublishPostRequest";
import { UnpublishPostRequest } from "../Requests/UnpublishPostRequest";
import { PostNotPublishableResponse } from "../Responses/PostNotPublishableResponse";
import { PostResponse } from "../Responses/PostResponse";
import { PublishPostHandler } from "./PublishPostHandler";
import { UnpublishPostHandler } from "./UnpublishPostHandler";

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
    tags: [],
    publishedAt: status === "published" ? AT : null,
    createdAt: AT,
    updatedAt: AT,
  };
  state.posts.set(post.id, post);
  return state;
}

function wire(state: FakePostState) {
  const posts = new PostAccessor(
    new HandlerResolverBuilder()
      .register(StorePostChangesRequest, new FakeStorePostChangesHandler(state))
      .build(),
    new HandlerResolverBuilder()
      .register(LoadPostByIdRequest, new FakeLoadPostByIdHandler(state))
      .build(),
    new HandlerResolverBuilder().build(),
  );
  const permissions = createPermissionEngine(
    new SiteConfigAccessor(
      new HandlerResolverBuilder()
        .register(
          LoadPostingPolicyRequest,
          new FakeLoadPostingPolicyHandler(new FakeSiteConfigState("anyone", "anyone")),
        )
        .build(),
    ),
  );
  return {
    publish: new PublishPostHandler(posts, permissions),
    unpublish: new UnpublishPostHandler(posts, permissions),
  };
}

const TAKEN_DOWN: readonly PostStatus[] = ["rejected", "hidden", "removed"];

describe("Publish and Unpublish on a post a moderator acted on", () => {
  test.each(TAKEN_DOWN)("publish of a %s post is NotPublishable", async (status) => {
    const { publish } = wire(stateWith(status));

    const response = await publish.handle(new PublishPostRequest(THEO, "p1"));

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
