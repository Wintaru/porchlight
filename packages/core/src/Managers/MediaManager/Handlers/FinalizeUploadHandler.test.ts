import { describe, expect, test } from "vitest";

import { FakeMediaAssetState } from "../../../Accessors/MediaAssetAccessor/FakeMediaAssetState";
import { FakeLoadMediaAssetByIdHandler } from "../../../Accessors/MediaAssetAccessor/Handlers/FakeLoadMediaAssetByIdHandler";
import { FakeStoreNewMediaAssetHandler } from "../../../Accessors/MediaAssetAccessor/Handlers/FakeStoreNewMediaAssetHandler";
import { MediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/MediaAssetAccessor";
import { LoadMediaAssetByIdRequest } from "../../../Accessors/MediaAssetAccessor/Requests/LoadMediaAssetByIdRequest";
import { StoreNewMediaAssetRequest } from "../../../Accessors/MediaAssetAccessor/Requests/StoreNewMediaAssetRequest";
import { FakeMediaStorageState } from "../../../Accessors/MediaStorageAccessor/FakeMediaStorageState";
import { FakeDownloadStorageObjectHandler } from "../../../Accessors/MediaStorageAccessor/Handlers/FakeDownloadStorageObjectHandler";
import { FakeRemoveStorageObjectHandler } from "../../../Accessors/MediaStorageAccessor/Handlers/FakeRemoveStorageObjectHandler";
import { MediaStorageAccessor } from "../../../Accessors/MediaStorageAccessor/MediaStorageAccessor";
import { DownloadStorageObjectRequest } from "../../../Accessors/MediaStorageAccessor/Requests/DownloadStorageObjectRequest";
import { RemoveStorageObjectRequest } from "../../../Accessors/MediaStorageAccessor/Requests/RemoveStorageObjectRequest";
import { FakeQuotaState } from "../../../Accessors/QuotaAccessor/FakeQuotaState";
import { FakeAdjustQuotaUsageHandler } from "../../../Accessors/QuotaAccessor/Handlers/FakeAdjustQuotaUsageHandler";
import { FakeLoadQuotaUsageHandler } from "../../../Accessors/QuotaAccessor/Handlers/FakeLoadQuotaUsageHandler";
import { QuotaAccessor } from "../../../Accessors/QuotaAccessor/QuotaAccessor";
import { AdjustQuotaUsageRequest } from "../../../Accessors/QuotaAccessor/Requests/AdjustQuotaUsageRequest";
import { LoadQuotaUsageRequest } from "../../../Accessors/QuotaAccessor/Requests/LoadQuotaUsageRequest";
import { FakeSiteConfigState } from "../../../Accessors/SiteConfigAccessor/FakeSiteConfigState";
import { FakeLoadAttachmentAllowlistHandler } from "../../../Accessors/SiteConfigAccessor/Handlers/FakeLoadAttachmentAllowlistHandler";
import { FakeLoadAttachmentQuotaByTrustHandler } from "../../../Accessors/SiteConfigAccessor/Handlers/FakeLoadAttachmentQuotaByTrustHandler";
import { SiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/SiteConfigAccessor";
import { LoadAttachmentAllowlistRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadAttachmentAllowlistRequest";
import { LoadAttachmentQuotaByTrustRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadAttachmentQuotaByTrustRequest";
import type { Actor } from "../../../Common/Actor";
import type { AttachmentQuotaByTrust } from "../../../Common/AttachmentQuota";
import { HandlerResolverBuilder } from "../../../Common/HandlerResolverBuilder";
import { createAttachmentEngine } from "../../../Composition/createAttachmentEngine";
import { createPermissionEngine } from "../../../Composition/createPermissionEngine";
import { createQuotaEngine } from "../../../Composition/createQuotaEngine";
import { mediaStoragePath } from "../mediaStoragePath";
import { FinalizeUploadRequest } from "../Requests/FinalizeUploadRequest";
import { MediaFinalizedResponse } from "../Responses/MediaFinalizedResponse";
import { MediaQuotaExceededResponse } from "../Responses/MediaQuotaExceededResponse";
import { MediaRejectedResponse } from "../Responses/MediaRejectedResponse";
import { FinalizeUploadHandler } from "./FinalizeUploadHandler";

const AT = new Date("2026-09-12T10:00:00.000Z");
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
const QUARANTINE_BUCKET = "quarantine";

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);

const QUOTA_BY_TRUST: AttachmentQuotaByTrust = {
  probation: { maxFileBytes: 1_000_000, maxAccountBytes: 2_000_000 },
  trusted: { maxFileBytes: 10_000_000, maxAccountBytes: 100_000_000 },
};

function ascii(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function harness(quotaState = new FakeQuotaState()) {
  const storageState = new FakeMediaStorageState();
  const storage = new MediaStorageAccessor(
    new HandlerResolverBuilder().build(),
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

  const assetState = new FakeMediaAssetState();
  const mediaAssets = new MediaAssetAccessor(
    new HandlerResolverBuilder()
      .register(StoreNewMediaAssetRequest, new FakeStoreNewMediaAssetHandler(assetState))
      .build(),
    new HandlerResolverBuilder()
      .register(LoadMediaAssetByIdRequest, new FakeLoadMediaAssetByIdHandler(assetState))
      .build(),
    new HandlerResolverBuilder().build(),
  );

  const quotas = new QuotaAccessor(
    new HandlerResolverBuilder()
      .register(LoadQuotaUsageRequest, new FakeLoadQuotaUsageHandler(quotaState))
      .build(),
    new HandlerResolverBuilder()
      .register(AdjustQuotaUsageRequest, new FakeAdjustQuotaUsageHandler(quotaState))
      .build(),
  );

  const siteConfigState = new FakeSiteConfigState(
    "anyone",
    "anyone",
    undefined,
    undefined,
    QUOTA_BY_TRUST,
  );
  const siteConfig = new SiteConfigAccessor(
    new HandlerResolverBuilder()
      .register(
        LoadAttachmentAllowlistRequest,
        new FakeLoadAttachmentAllowlistHandler(siteConfigState),
      )
      .register(
        LoadAttachmentQuotaByTrustRequest,
        new FakeLoadAttachmentQuotaByTrustHandler(siteConfigState),
      )
      .build(),
  );

  const permissions = createPermissionEngine(siteConfig);
  const attachments = createAttachmentEngine();
  const quotaEngine = createQuotaEngine();
  const handler = new FinalizeUploadHandler(
    storage,
    mediaAssets,
    quotas,
    siteConfig,
    permissions,
    attachments,
    quotaEngine,
    { quarantineBucket: QUARANTINE_BUCKET },
  );

  function seed(mediaId: string, filename: string, bytes: Uint8Array): void {
    const path = mediaStoragePath(
      { kind: "member", profileId: "u-theo" },
      mediaId,
      filename,
    );
    storageState.objects.set(storageState.key(QUARANTINE_BUCKET, path), bytes);
  }

  return { handler, storageState, assetState, quotaState, seed };
}

describe("FinalizeUploadHandler", () => {
  test("a real PNG finalizes: the row is stored and quota is bumped", async () => {
    const { handler, assetState, quotaState, seed } = harness();
    seed("11111111-1111-4111-8111-111111111111", "porch.png", PNG_BYTES);

    const result = await handler.handle(
      new FinalizeUploadRequest(
        THEO,
        "11111111-1111-4111-8111-111111111111",
        "porch.png",
      ),
    );

    expect(result).toBeInstanceOf(MediaFinalizedResponse);
    expect(result).toMatchObject({ asset: { kind: "image", mimeType: "image/png" } });
    expect(assetState.assets.get("11111111-1111-4111-8111-111111111111")).toBeDefined();
    expect(quotaState.usage.get(THEO.profile.id)).toMatchObject({
      bytesUsed: PNG_BYTES.length,
      filesCount: 1,
    });
  });

  test("an SVG renamed to .png is rejected, and the quarantine object is cleaned up", async () => {
    const { handler, storageState, assetState, seed } = harness();
    const svg = ascii('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    seed("22222222-2222-4222-8222-222222222222", "porch.png", svg);

    const result = await handler.handle(
      new FinalizeUploadRequest(
        THEO,
        "22222222-2222-4222-8222-222222222222",
        "porch.png",
      ),
    );

    expect(result).toBeInstanceOf(MediaRejectedResponse);
    expect(result).toMatchObject({ reason: "type-mismatch" });
    expect(assetState.assets.has("22222222-2222-4222-8222-222222222222")).toBe(false);
    const path = mediaStoragePath(
      { kind: "member", profileId: THEO.profile.id },
      "22222222-2222-4222-8222-222222222222",
      "porch.png",
    );
    expect(storageState.objects.has(storageState.key(QUARANTINE_BUCKET, path))).toBe(
      false,
    );
  });

  test("a visitor cannot finalize a member upload", async () => {
    const { handler, seed } = harness();
    seed("33333333-3333-4333-8333-333333333333", "porch.png", PNG_BYTES);

    const result = await handler.handle(
      new FinalizeUploadRequest(
        { kind: "visitor" },
        "33333333-3333-4333-8333-333333333333",
        "porch.png",
      ),
    );

    expect(result).toMatchObject({ reason: "signed-out" });
  });

  // A member could declare a tiny size at RequestUploadUrl time (skipping that gate)
  // and then actually PUT anything to the signed URL — finalize is the only point that
  // ever sees the real bytes, so it must be the one place the cap is actually enforced.
  test("a file whose real size is over the per-file cap is refused at finalize, and cleaned up", async () => {
    const { handler, storageState, assetState, quotaState, seed } = harness();
    const overCap = new Uint8Array(11_000_000);
    overCap.set(PNG_BYTES);
    seed("44444444-4444-4444-8444-444444444444", "porch.png", overCap);

    const result = await handler.handle(
      new FinalizeUploadRequest(
        THEO,
        "44444444-4444-4444-8444-444444444444",
        "porch.png",
      ),
    );

    expect(result).toBeInstanceOf(MediaQuotaExceededResponse);
    expect(result).toMatchObject({ reason: "file-too-large", limit: 10_000_000 });
    expect(assetState.assets.has("44444444-4444-4444-8444-444444444444")).toBe(false);
    expect(quotaState.usage.has(THEO.profile.id)).toBe(false);
    const path = mediaStoragePath(
      { kind: "member", profileId: THEO.profile.id },
      "44444444-4444-4444-8444-444444444444",
      "porch.png",
    );
    expect(storageState.objects.has(storageState.key(QUARANTINE_BUCKET, path))).toBe(
      false,
    );
  });
});
