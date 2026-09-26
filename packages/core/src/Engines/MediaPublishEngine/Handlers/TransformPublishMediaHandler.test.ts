import sharp from "sharp";
import { describe, expect, test } from "vitest";

import { FakeMediaAssetState } from "../../../Accessors/MediaAssetAccessor/FakeMediaAssetState";
import { FakeStoreMediaAssetChangesHandler } from "../../../Accessors/MediaAssetAccessor/Handlers/FakeStoreMediaAssetChangesHandler";
import { MediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/MediaAssetAccessor";
import { StoreMediaAssetChangesRequest } from "../../../Accessors/MediaAssetAccessor/Requests/StoreMediaAssetChangesRequest";
import { FakeMediaStorageState } from "../../../Accessors/MediaStorageAccessor/FakeMediaStorageState";
import { FakeDownloadStorageObjectHandler } from "../../../Accessors/MediaStorageAccessor/Handlers/FakeDownloadStorageObjectHandler";
import { FakeRemoveStorageObjectHandler } from "../../../Accessors/MediaStorageAccessor/Handlers/FakeRemoveStorageObjectHandler";
import { FakeUploadStorageObjectHandler } from "../../../Accessors/MediaStorageAccessor/Handlers/FakeUploadStorageObjectHandler";
import { MediaStorageAccessor } from "../../../Accessors/MediaStorageAccessor/MediaStorageAccessor";
import { DownloadStorageObjectRequest } from "../../../Accessors/MediaStorageAccessor/Requests/DownloadStorageObjectRequest";
import { RemoveStorageObjectRequest } from "../../../Accessors/MediaStorageAccessor/Requests/RemoveStorageObjectRequest";
import { UploadStorageObjectRequest } from "../../../Accessors/MediaStorageAccessor/Requests/UploadStorageObjectRequest";
import { HandlerResolverBuilder } from "../../../Common/HandlerResolverBuilder";
import type { MediaAsset } from "../../../Common/MediaAsset";
import { PublishMediaRequest } from "../Requests/PublishMediaRequest";
import { MediaPublishedResponse } from "../Responses/MediaPublishedResponse";
import { MediaUnpublishableResponse } from "../Responses/MediaUnpublishableResponse";
import { TransformPublishMediaHandler } from "./TransformPublishMediaHandler";

const AT = new Date("2026-09-25T10:00:00.000Z");
const ID = "12121212-1212-4121-8121-121212121212";

function asset(overrides: Partial<MediaAsset>): MediaAsset {
  return {
    id: ID,
    owner: { kind: "member", profileId: "u-theo" },
    storagePath: `member-u-theo/${ID}.png`,
    publishedPath: null,
    kind: "image",
    mimeType: "image/png",
    originalFilename: "study.png",
    bytes: 100,
    sha256: "0".repeat(64),
    scanStatus: "flagged",
    mature: true,
    retainUntil: null,
    createdAt: AT,
    updatedAt: AT,
    ...overrides,
  };
}

function harness(start: MediaAsset, assetsFailing = false) {
  const storageState = new FakeMediaStorageState();
  const storage = new MediaStorageAccessor(
    new HandlerResolverBuilder()
      .register(
        UploadStorageObjectRequest,
        new FakeUploadStorageObjectHandler(storageState),
      )
      .build(),
    new HandlerResolverBuilder()
      .register(
        DownloadStorageObjectRequest,
        new FakeDownloadStorageObjectHandler(storageState),
      )
      .build(),
    new HandlerResolverBuilder()
      .register(
        RemoveStorageObjectRequest,
        new FakeRemoveStorageObjectHandler(storageState),
      )
      .build(),
  );
  const assetState = new FakeMediaAssetState(assetsFailing);
  assetState.assets.set(start.id, start);
  const mediaAssets = new MediaAssetAccessor(
    new HandlerResolverBuilder()
      .register(
        StoreMediaAssetChangesRequest,
        new FakeStoreMediaAssetChangesHandler(assetState),
      )
      .build(),
    new HandlerResolverBuilder().build(),
    new HandlerResolverBuilder().build(),
  );
  const handler = new TransformPublishMediaHandler(storage, mediaAssets, {
    quarantineBucket: "quarantine",
    publicBucket: "public-media",
  });
  return { handler, storageState, assetState };
}

async function png(): Promise<Uint8Array> {
  const bytes = await sharp({
    create: { width: 3200, height: 1600, channels: 3, background: "#222222" },
  })
    .png()
    .toBuffer();
  return new Uint8Array(bytes);
}

describe("TransformPublishMediaHandler", () => {
  test("an approved flagged image is read back from quarantine, scaled and published", async () => {
    const start = asset({});
    const { handler, storageState, assetState } = harness(start);
    storageState.objects.set(
      storageState.key("quarantine", start.storagePath),
      await png(),
    );

    const result = await handler.handle(new PublishMediaRequest(start, undefined));

    expect(result).toBeInstanceOf(MediaPublishedResponse);
    expect(assetState.assets.get(ID)?.publishedPath).toBe(`public-media/${ID}.png`);
    const copy = storageState.objects.get(storageState.key("public-media", `${ID}.png`));
    if (copy === undefined) {
      throw new Error("no public copy");
    }
    // The longest side is capped; the aspect ratio is kept.
    expect(await sharp(copy).metadata()).toMatchObject({ width: 2400, height: 1200 });
  });

  test("pending, locked and unapproved flagged uploads never get a public copy", async () => {
    for (const [overrides, reason] of [
      [{ scanStatus: "pending" }, "not-cleared"],
      [{ scanStatus: "locked" }, "not-cleared"],
      [{ scanStatus: "flagged", mature: false }, "not-cleared"],
    ] as const) {
      const start = asset(overrides);
      const { handler, storageState } = harness(start);
      const result = await handler.handle(new PublishMediaRequest(start, await png()));
      expect(result).toEqual(
        new MediaUnpublishableResponse(result.correlationId, reason),
      );
      expect(storageState.objects.size).toBe(0);
    }
  });

  test("a document is copied as it is, under the asset's id", async () => {
    const start = asset({
      kind: "document",
      mimeType: "application/pdf",
      originalFilename: "Plan Final.PDF",
      scanStatus: "clear",
    });
    const { handler, storageState, assetState } = harness(start);
    const pdf = new TextEncoder().encode("%PDF-1.7 a plan");
    const result = await handler.handle(new PublishMediaRequest(start, pdf));
    expect(result).toBeInstanceOf(MediaPublishedResponse);
    expect(assetState.assets.get(ID)?.publishedPath).toBe(`public-media/${ID}.pdf`);
    expect(
      storageState.objects.get(storageState.key("public-media", `${ID}.pdf`)),
    ).toEqual(pdf);
  });

  test("an image that is already published is left as it is", async () => {
    const start = asset({ publishedPath: `public-media/${ID}.png` });
    const { handler, storageState } = harness(start);
    const result = await handler.handle(new PublishMediaRequest(start, await png()));
    expect(result).toMatchObject({ asset: { publishedPath: `public-media/${ID}.png` } });
    expect(storageState.objects.size).toBe(0);
  });

  test("a row deleted during the publish takes its public copy with it", async () => {
    const start = asset({ scanStatus: "clear" });
    const { handler, storageState, assetState } = harness(start);
    // What a DeleteMedia between the upload and the row write leaves: no row.
    assetState.assets.delete(ID);
    const result = await handler.handle(new PublishMediaRequest(start, await png()));
    expect(result).toMatchObject({
      reason: "unexpected MediaAssetNotFoundResponse from mediaAssets.store",
    });
    expect(storageState.objects.size).toBe(0);
  });

  test("a failed row write leaves the copy, since the write may have landed", async () => {
    const start = asset({ scanStatus: "clear" });
    const { handler, storageState } = harness(start, true);
    const result = await handler.handle(new PublishMediaRequest(start, await png()));
    expect(result).toMatchObject({ reason: "MEDIA_FAKE_RESULT=fail" });
    expect(storageState.objects.size).toBe(1);
  });

  test("bytes that do not decode are refused, not published", async () => {
    const start = asset({ scanStatus: "clear" });
    const { handler, assetState } = harness(start);
    const notReallyPng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const result = await handler.handle(new PublishMediaRequest(start, notReallyPng));
    expect(result).toMatchObject({ reason: "undecodable" });
    expect(assetState.assets.get(ID)?.publishedPath).toBeNull();
  });
});
