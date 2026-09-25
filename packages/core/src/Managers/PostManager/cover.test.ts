import { describe, expect, test } from "vitest";

import { FakeMediaAssetState } from "../../Accessors/MediaAssetAccessor/FakeMediaAssetState";
import { FakeLoadMediaAssetByIdHandler } from "../../Accessors/MediaAssetAccessor/Handlers/FakeLoadMediaAssetByIdHandler";
import { MediaAssetAccessor } from "../../Accessors/MediaAssetAccessor/MediaAssetAccessor";
import { LoadMediaAssetByIdRequest } from "../../Accessors/MediaAssetAccessor/Requests/LoadMediaAssetByIdRequest";
import { HandlerResolverBuilder } from "../../Common/HandlerResolverBuilder";
import type { MediaAsset } from "../../Common/MediaAsset";
import { checkCover } from "./checkCover";
import { coverAwaitsReview } from "./coverAwaitsReview";
import { PostRejectedResponse } from "./Responses/PostRejectedResponse";

// A post's cover (#36, #52): whose image may be one, and when one holds a post for review.
const AT = new Date("2026-09-25T10:00:00.000Z");
const THEO = "00000000-0000-4000-8000-000000000003";
const CONTEXT = { correlationId: "c-1" };

function asset(id: string, overrides: Partial<MediaAsset>): MediaAsset {
  return {
    id,
    owner: { kind: "member", profileId: THEO },
    storagePath: `member-${THEO}/${id}.jpeg`,
    publishedPath: `public-media/${id}.jpg`,
    kind: "image",
    mimeType: "image/jpeg",
    originalFilename: "porch.jpg",
    bytes: 100,
    sha256: "0".repeat(64),
    scanStatus: "clear",
    mature: false,
    retainUntil: null,
    createdAt: AT,
    updatedAt: AT,
    ...overrides,
  };
}

function accessor(...assets: MediaAsset[]): MediaAssetAccessor {
  const state = new FakeMediaAssetState();
  for (const each of assets) {
    state.assets.set(each.id, each);
  }
  return new MediaAssetAccessor(
    new HandlerResolverBuilder().build(),
    new HandlerResolverBuilder()
      .register(LoadMediaAssetByIdRequest, new FakeLoadMediaAssetByIdHandler(state))
      .build(),
    new HandlerResolverBuilder().build(),
  );
}

describe("checkCover", () => {
  test("the author's own cleared or flagged image may be a cover, or none at all", async () => {
    const media = accessor(asset("a", {}), asset("b", { scanStatus: "flagged" }));
    for (const id of ["a", "b", null, undefined]) {
      expect(await checkCover(media, THEO, id, CONTEXT)).toBeUndefined();
    }
  });

  test("someone else's image, a document, a locked or unknown upload is refused", async () => {
    const media = accessor(
      asset("theirs", { owner: { kind: "member", profileId: "someone-else" } }),
      asset("doc", { kind: "document", mimeType: "application/pdf" }),
      asset("locked", { scanStatus: "locked", publishedPath: null }),
    );
    for (const id of ["theirs", "doc", "locked", "missing"]) {
      const verdict = await checkCover(media, THEO, id, CONTEXT);
      expect(verdict).toBeInstanceOf(PostRejectedResponse);
      expect(verdict).toMatchObject({ reason: "cover" });
    }
  });
});

describe("coverAwaitsReview", () => {
  test("only a flagged cover with no published copy holds a post", async () => {
    const media = accessor(
      asset("flagged", { scanStatus: "flagged", publishedPath: null }),
      asset("approved", { scanStatus: "flagged", mature: true }),
      asset("clear", {}),
    );
    expect(await coverAwaitsReview(media, "flagged", CONTEXT)).toBe(true);
    expect(await coverAwaitsReview(media, "approved", CONTEXT)).toBe(false);
    expect(await coverAwaitsReview(media, "clear", CONTEXT)).toBe(false);
    expect(await coverAwaitsReview(media, null, CONTEXT)).toBe(false);
  });
});
