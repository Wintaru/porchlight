import { describe, expect, test } from "vitest";

import { FakeMediaAssetState } from "../../../Accessors/MediaAssetAccessor/FakeMediaAssetState";
import { FakeLoadMediaAssetByIdHandler } from "../../../Accessors/MediaAssetAccessor/Handlers/FakeLoadMediaAssetByIdHandler";
import { FakeStoreMediaAssetChangesHandler } from "../../../Accessors/MediaAssetAccessor/Handlers/FakeStoreMediaAssetChangesHandler";
import { MediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/MediaAssetAccessor";
import { LoadMediaAssetByIdRequest } from "../../../Accessors/MediaAssetAccessor/Requests/LoadMediaAssetByIdRequest";
import { StoreMediaAssetChangesRequest } from "../../../Accessors/MediaAssetAccessor/Requests/StoreMediaAssetChangesRequest";
import type { Actor } from "../../../Common/Actor";
import { HandlerResolverBuilder } from "../../../Common/HandlerResolverBuilder";
import type { MediaAsset } from "../../../Common/MediaAsset";
import { AttachMediaToPostRequest } from "../Requests/AttachMediaToPostRequest";
import { MediaAttachedResponse } from "../Responses/MediaAttachedResponse";
import { MediaForbiddenResponse } from "../Responses/MediaForbiddenResponse";
import { NoSuchMediaResponse } from "../Responses/NoSuchMediaResponse";
import { AttachMediaToPostHandler } from "./AttachMediaToPostHandler";

const AT = new Date("2026-09-27T10:00:00.000Z");
const THEO: Actor & { kind: "member" } = {
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

function asset(overrides: Partial<MediaAsset> = {}): MediaAsset {
  return {
    id: "m-porch",
    owner: { kind: "member", profileId: THEO.profile.id },
    storagePath: "members/u-theo/porch.png",
    publishedPath: null,
    kind: "image",
    mimeType: "image/png",
    originalFilename: "porch.png",
    bytes: 10,
    sha256: "a".repeat(64),
    scanStatus: "clear",
    mature: false,
    postId: null,
    usedInPost: false,
    retainUntil: null,
    createdAt: AT,
    updatedAt: AT,
    ...overrides,
  };
}

async function attach(stored: MediaAsset | undefined, postId = "p-porch") {
  const state = new FakeMediaAssetState();
  if (stored !== undefined) {
    state.assets.set(stored.id, stored);
  }
  const handler = new AttachMediaToPostHandler(
    new MediaAssetAccessor(
      new HandlerResolverBuilder()
        .register(
          StoreMediaAssetChangesRequest,
          new FakeStoreMediaAssetChangesHandler(state),
        )
        .build(),
      new HandlerResolverBuilder()
        .register(LoadMediaAssetByIdRequest, new FakeLoadMediaAssetByIdHandler(state))
        .build(),
      new HandlerResolverBuilder().build(),
    ),
  );
  const result = await handler.handle(
    new AttachMediaToPostRequest(THEO, "m-porch", postId),
  );
  return { state, result };
}

describe("AttachMediaToPostHandler", () => {
  test("an upload with no post joins the one it was made for", async () => {
    const { state, result } = await attach(asset());

    expect(result).toBeInstanceOf(MediaAttachedResponse);
    expect(state.assets.get("m-porch")?.postId).toBe("p-porch");
  });

  test("an upload that already belongs to a post stays with it", async () => {
    const { state } = await attach(asset({ postId: "p-first" }), "p-second");

    expect(state.assets.get("m-porch")?.postId).toBe("p-first");
  });

  test("someone else's upload is refused", async () => {
    const { state, result } = await attach(
      asset({ owner: { kind: "member", profileId: "u-ivy" } }),
    );

    expect(result).toBeInstanceOf(MediaForbiddenResponse);
    expect(state.assets.get("m-porch")?.postId).toBeNull();
  });

  test("an unknown upload is no such media", async () => {
    const { result } = await attach(undefined);

    expect(result).toBeInstanceOf(NoSuchMediaResponse);
  });
});
