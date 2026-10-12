import { describe, expect, test } from "vitest";

import { FakeMediaAssetState } from "../../../Accessors/MediaAssetAccessor/FakeMediaAssetState";
import { NotificationAccessor } from "../../../Accessors/NotificationAccessor/NotificationAccessor";
import { FakePostState } from "../../../Accessors/PostAccessor/FakePostState";
import { FakeLoadPostByIdHandler } from "../../../Accessors/PostAccessor/Handlers/FakeLoadPostByIdHandler";
import { FakeStorePostChangesHandler } from "../../../Accessors/PostAccessor/Handlers/FakeStorePostChangesHandler";
import { PostAccessor } from "../../../Accessors/PostAccessor/PostAccessor";
import { LoadPostByIdRequest } from "../../../Accessors/PostAccessor/Requests/LoadPostByIdRequest";
import { StorePostChangesRequest } from "../../../Accessors/PostAccessor/Requests/StorePostChangesRequest";
import { ProfileAccessor } from "../../../Accessors/ProfileAccessor/ProfileAccessor";
import { ReportAccessor } from "../../../Accessors/ReportAccessor/ReportAccessor";
import { FakeSiteConfigState } from "../../../Accessors/SiteConfigAccessor/FakeSiteConfigState";
import { FakeLoadAgentsPolicyHandler } from "../../../Accessors/SiteConfigAccessor/Handlers/FakeLoadAgentsPolicyHandler";
import { FakeLoadPostingPolicyHandler } from "../../../Accessors/SiteConfigAccessor/Handlers/FakeLoadPostingPolicyHandler";
import { LoadAgentsPolicyRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadAgentsPolicyRequest";
import { LoadPostingPolicyRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadPostingPolicyRequest";
import { SiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/SiteConfigAccessor";
import type { AgentActor } from "../../../Common/Actor";
import { CENTERED_COVER_FRAME } from "../../../Common/CoverFrame";
import { HandlerResolverBuilder } from "../../../Common/HandlerResolverBuilder";
import type { MediaAsset } from "../../../Common/MediaAsset";
import type { Post } from "../../../Common/Post";
import type { PostStatus } from "../../../Common/PostStatus";
import { createFakeMediaAssetAccessor } from "../../../Composition/createMediaAssetAccessor";
import { createPermissionEngine } from "../../../Composition/createPermissionEngine";
import { TEST_ORIGIN } from "../../../Composition/FakeEnvironment.test-helper";
import { ContentRenderEngine } from "../../../Engines/ContentRenderEngine/ContentRenderEngine";
import { TextEvidenceRecordedResponse } from "../../../Engines/EvidenceEngine/Responses/TextEvidenceRecordedResponse";
import { FollowersNotifiedResponse } from "../../../Engines/FollowerNoticeEngine/Responses/FollowersNotifiedResponse";
import type { PostDraftChanges } from "../PostDraftChanges";
import { UpdateDraftRequest } from "../Requests/UpdateDraftRequest";
import { PostRejectedResponse } from "../Responses/PostRejectedResponse";
import { PostResponse } from "../Responses/PostResponse";
import { UpdateDraftHandler } from "./UpdateDraftHandler";

// An agent sets, clears or keeps a post's cover through update_draft (the MCP door),
// on a draft or, with posts:edit, on a published post, where the change is live at once.

const AT = new Date("2026-10-12T10:00:00.000Z");
const THEO_ID = "u-theo";
const AGENT: AgentActor = {
  kind: "agent",
  profile: {
    id: THEO_ID,
    handle: "theo",
    displayName: null,
    avatarUrl: null,
    bio: null,
    role: "member",
    trustLevel: "trusted",
    status: "active",
    createdAt: AT,
  },
  grant: { tokenId: "t-theo", scopes: ["posts:draft", "posts:edit"] },
};

function image(id: string, overrides: Partial<MediaAsset> = {}): MediaAsset {
  return {
    id,
    owner: { kind: "member", profileId: THEO_ID },
    storagePath: `members/u-theo/${id}.png`,
    publishedPath: `public-media/${id}.jpg`,
    kind: "image",
    mimeType: "image/png",
    originalFilename: `${id}.png`,
    bytes: 10,
    sha256: "a".repeat(64),
    scanStatus: "clear",
    mature: false,
    postId: null,
    usedInPost: false,
    rejectedAt: null,
    retainUntil: null,
    createdAt: AT,
    updatedAt: AT,
    ...overrides,
  };
}

const UPLOADS: readonly MediaAsset[] = [
  image("old-cover"),
  image("new-cover"),
  image("theirs", { owner: { kind: "member", profileId: "u-someone-else" } }),
  image("doc", { kind: "document", mimeType: "application/pdf" }),
  image("held", { scanStatus: "flagged", publishedPath: null }),
];

function wire(status: PostStatus) {
  const postState = new FakePostState();
  const post: Post = {
    id: "p1",
    author: { kind: "member", profileId: THEO_ID },
    slug: "p1",
    title: "P1",
    bodyMd: "No pictures in the body.",
    bodyHtml: "<p>No pictures in the body.</p>",
    summary: null,
    coverMediaId: "old-cover",
    coverFrame: { focusX: 0.2, focusY: 0.8, zoom: 1.5 },
    status,
    visibility: "public",
    commentsEnabled: true,
    rejectionReason: null,
    origin: "editor",
    agentTokenId: null,
    reviewedAt: null,
    agentDraftMd: null,
    agentEditedAt: null,
    tags: [],
    publishedAt: status === "published" ? AT : null,
    createdAt: AT,
    updatedAt: AT,
    version: 1,
  };
  postState.posts.set(post.id, post);
  const mediaState = new FakeMediaAssetState();
  for (const upload of UPLOADS) {
    mediaState.assets.set(upload.id, upload);
  }

  const policy = new FakeSiteConfigState("anyone", "anyone");
  const siteConfig = new SiteConfigAccessor(
    new HandlerResolverBuilder().build(),
    new HandlerResolverBuilder()
      .register(LoadPostingPolicyRequest, new FakeLoadPostingPolicyHandler(policy))
      .register(LoadAgentsPolicyRequest, new FakeLoadAgentsPolicyHandler(policy))
      .build(),
  );
  const empty = () => new HandlerResolverBuilder().build();
  // A cover-only save renders nothing, changes no audience and writes no evidence, so
  // the engines and stores those paths need stay empty.
  const handler = new UpdateDraftHandler(
    new PostAccessor(
      new HandlerResolverBuilder()
        .register(StorePostChangesRequest, new FakeStorePostChangesHandler(postState))
        .build(),
      new HandlerResolverBuilder()
        .register(LoadPostByIdRequest, new FakeLoadPostByIdHandler(postState))
        .build(),
      empty(),
    ),
    new ContentRenderEngine(empty()),
    createPermissionEngine(siteConfig),
    createFakeMediaAssetAccessor(mediaState),
    new ProfileAccessor(empty(), empty()),
    new NotificationAccessor(empty(), empty()),
    {
      transform: (request) =>
        Promise.resolve(new FollowersNotifiedResponse(request.correlationId, 0)),
    },
    {
      transform: (request) =>
        Promise.resolve(new TextEvidenceRecordedResponse(request.correlationId)),
    },
    new ReportAccessor(empty(), empty()),
  );
  const update = (changes: PostDraftChanges) =>
    handler.handle(
      new UpdateDraftRequest(AGENT, "p1", changes, undefined, undefined, TEST_ORIGIN),
    );
  return { update, postState };
}

describe("UpdateDraftHandler: an agent and the cover", () => {
  test.each<PostStatus>(["draft", "published"])(
    "on a %s post, a new cover is set and starts centred",
    async (status) => {
      const { update, postState } = wire(status);

      const response = await update({ coverMediaId: "new-cover" });

      expect(response).toBeInstanceOf(PostResponse);
      expect(postState.posts.get("p1")).toMatchObject({
        status,
        coverMediaId: "new-cover",
        coverFrame: CENTERED_COVER_FRAME,
      });
    },
  );

  test("null clears the cover", async () => {
    const { update, postState } = wire("published");

    await update({ coverMediaId: null });

    expect(postState.posts.get("p1")?.coverMediaId).toBeNull();
  });

  test("a save that leaves the cover out keeps it and its framing", async () => {
    const { update, postState } = wire("published");

    await update({ title: "A new title" });

    expect(postState.posts.get("p1")).toMatchObject({
      title: "A new title",
      coverMediaId: "old-cover",
      coverFrame: { focusX: 0.2, focusY: 0.8, zoom: 1.5 },
    });
  });

  test.each(["theirs", "doc", "missing"])(
    "%s is refused as a cover, and the old one stays",
    async (mediaId) => {
      const { update, postState } = wire("published");

      const response = await update({ coverMediaId: mediaId });

      expect(response).toBeInstanceOf(PostRejectedResponse);
      expect(response).toMatchObject({ reason: "cover" });
      expect(postState.posts.get("p1")?.coverMediaId).toBe("old-cover");
    },
  );

  test("an image held for review may wait on a draft, but not on a published post", async () => {
    const onDraft = wire("draft");
    const onPublished = wire("published");

    const drafted = await onDraft.update({ coverMediaId: "held" });
    const published = await onPublished.update({ coverMediaId: "held" });

    // As in the editor: publishing the draft sends it to a moderator first.
    expect(drafted).toBeInstanceOf(PostResponse);
    expect(published).toMatchObject({ reason: "cover" });
    expect(onPublished.postState.posts.get("p1")?.coverMediaId).toBe("old-cover");
  });
});
