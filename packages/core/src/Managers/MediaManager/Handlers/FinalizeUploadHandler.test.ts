import { FakeStoreMediaAssetChangesHandler } from "../../../Accessors/MediaAssetAccessor/Handlers/FakeStoreMediaAssetChangesHandler";
import { StoreMediaAssetChangesRequest } from "../../../Accessors/MediaAssetAccessor/Requests/StoreMediaAssetChangesRequest";
import { FakeUploadStorageObjectHandler } from "../../../Accessors/MediaStorageAccessor/Handlers/FakeUploadStorageObjectHandler";
import { UploadStorageObjectRequest } from "../../../Accessors/MediaStorageAccessor/Requests/UploadStorageObjectRequest";
import { createMediaPublishEngine } from "../../../Composition/createMediaPublishEngine";
import sharp from "sharp";
import { describe, expect, test } from "vitest";

import { FakeHashMatchState } from "../../../Accessors/HashMatchAccessor/FakeHashMatchState";
import { FakeMatchImageHashHandler } from "../../../Accessors/HashMatchAccessor/Handlers/FakeMatchImageHashHandler";
import { HashMatchAccessor } from "../../../Accessors/HashMatchAccessor/HashMatchAccessor";
import { MatchImageHashRequest } from "../../../Accessors/HashMatchAccessor/Requests/MatchImageHashRequest";
import { FakeImageClassifierState } from "../../../Accessors/ImageClassifierAccessor/FakeImageClassifierState";
import { FakeClassifyImageHandler } from "../../../Accessors/ImageClassifierAccessor/Handlers/FakeClassifyImageHandler";
import { ImageClassifierAccessor } from "../../../Accessors/ImageClassifierAccessor/ImageClassifierAccessor";
import { ClassifyImageRequest } from "../../../Accessors/ImageClassifierAccessor/Requests/ClassifyImageRequest";
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
import { FakeLoadAgentsPolicyHandler } from "../../../Accessors/SiteConfigAccessor/Handlers/FakeLoadAgentsPolicyHandler";
import { FakeLoadAttachmentAllowlistHandler } from "../../../Accessors/SiteConfigAccessor/Handlers/FakeLoadAttachmentAllowlistHandler";
import { FakeLoadAttachmentQuotaByTrustHandler } from "../../../Accessors/SiteConfigAccessor/Handlers/FakeLoadAttachmentQuotaByTrustHandler";
import { FakeLoadModerationThresholdsHandler } from "../../../Accessors/SiteConfigAccessor/Handlers/FakeLoadModerationThresholdsHandler";
import { FakeLoadRawIpRetentionDaysHandler } from "../../../Accessors/SiteConfigAccessor/Handlers/FakeLoadRawIpRetentionDaysHandler";
import { SiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/SiteConfigAccessor";
import { LoadAgentsPolicyRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadAgentsPolicyRequest";
import { LoadAttachmentAllowlistRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadAttachmentAllowlistRequest";
import { LoadAttachmentQuotaByTrustRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadAttachmentQuotaByTrustRequest";
import { LoadModerationThresholdsRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadModerationThresholdsRequest";
import { LoadRawIpRetentionDaysRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadRawIpRetentionDaysRequest";
import type { Actor } from "../../../Common/Actor";
import type { AttachmentQuotaByTrust } from "../../../Common/AttachmentQuota";
import { HandlerResolverBuilder } from "../../../Common/HandlerResolverBuilder";
import { createAttachmentEngine } from "../../../Composition/createAttachmentEngine";
import { createModerationPolicyEngine } from "../../../Composition/createModerationPolicyEngine";
import { createPermissionEngine } from "../../../Composition/createPermissionEngine";
import { createQuotaEngine } from "../../../Composition/createQuotaEngine";
import { mediaStoragePath } from "../mediaStoragePath";
import { FinalizeUploadRequest } from "../Requests/FinalizeUploadRequest";
import { MediaFinalizedResponse } from "../Responses/MediaFinalizedResponse";
import { MediaQuotaExceededResponse } from "../Responses/MediaQuotaExceededResponse";
import { MediaRefusedResponse } from "../Responses/MediaRefusedResponse";
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
const PUBLIC_BUCKET = "public-media";
const IP_HASH_SALT = "test-salt";
const CLIENT_IP = "203.0.113.5";

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);

const QUOTA_BY_TRUST: AttachmentQuotaByTrust = {
  probation: { maxFileBytes: 1_000_000, maxAccountBytes: 2_000_000 },
  trusted: { maxFileBytes: 10_000_000, maxAccountBytes: 100_000_000 },
};

function ascii(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function harness(
  hashResult: "clear" | "match" | "fail" = "clear",
  classifierResult: "clear" | "flagged" | "locked" | "fail" = "clear",
  quotaState = new FakeQuotaState(),
) {
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

  const assetState = new FakeMediaAssetState();
  const mediaAssets = new MediaAssetAccessor(
    new HandlerResolverBuilder()
      .register(StoreNewMediaAssetRequest, new FakeStoreNewMediaAssetHandler(assetState))
      .register(
        StoreMediaAssetChangesRequest,
        new FakeStoreMediaAssetChangesHandler(assetState),
      )
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
    new HandlerResolverBuilder().build(),
    new HandlerResolverBuilder()
      .register(
        LoadAttachmentAllowlistRequest,
        new FakeLoadAttachmentAllowlistHandler(siteConfigState),
      )
      .register(
        LoadAttachmentQuotaByTrustRequest,
        new FakeLoadAttachmentQuotaByTrustHandler(siteConfigState),
      )
      .register(
        LoadModerationThresholdsRequest,
        new FakeLoadModerationThresholdsHandler(siteConfigState),
      )
      .register(
        LoadRawIpRetentionDaysRequest,
        new FakeLoadRawIpRetentionDaysHandler(siteConfigState),
      )
      // The agent rules read `agents` (#31).
      .register(LoadAgentsPolicyRequest, new FakeLoadAgentsPolicyHandler(siteConfigState))
      .build(),
  );

  const hashMatch = new HashMatchAccessor(
    new HandlerResolverBuilder()
      .register(
        MatchImageHashRequest,
        new FakeMatchImageHashHandler(new FakeHashMatchState(hashResult)),
      )
      .build(),
  );
  const imageClassifier = new ImageClassifierAccessor(
    new HandlerResolverBuilder()
      .register(
        ClassifyImageRequest,
        new FakeClassifyImageHandler(new FakeImageClassifierState(classifierResult)),
      )
      .build(),
  );

  const permissions = createPermissionEngine(siteConfig);
  const attachments = createAttachmentEngine();
  const quotaEngine = createQuotaEngine();
  const moderationPolicy = createModerationPolicyEngine();
  const handler = new FinalizeUploadHandler(
    storage,
    mediaAssets,
    quotas,
    siteConfig,
    permissions,
    attachments,
    hashMatch,
    imageClassifier,
    moderationPolicy,
    quotaEngine,
    createMediaPublishEngine(
      {
        STORAGE_BUCKET_QUARANTINE: QUARANTINE_BUCKET,
        STORAGE_BUCKET_PUBLIC: PUBLIC_BUCKET,
      },
      storage,
      mediaAssets,
    ),
    { quarantineBucket: QUARANTINE_BUCKET, ipHashSalt: IP_HASH_SALT },
  );

  function seed(mediaId: string, filename: string, bytes: Uint8Array): void {
    const path = mediaStoragePath(
      { kind: "member", profileId: "u-theo" },
      mediaId,
      filename,
    );
    storageState.objects.set(storageState.key(QUARANTINE_BUCKET, path), bytes);
  }

  function finalize(mediaId: string, filename: string) {
    return handler.handle(
      new FinalizeUploadRequest(THEO, mediaId, filename, CLIENT_IP, "test-agent"),
    );
  }

  return { handler, storageState, assetState, quotaState, seed, finalize };
}

describe("FinalizeUploadHandler", () => {
  test("a real PNG finalizes clear: the row is stored, evidence is written, quota is bumped", async () => {
    const { assetState, quotaState, seed, finalize } = harness();
    seed("11111111-1111-4111-8111-111111111111", "porch.png", PNG_BYTES);

    const result = await finalize("11111111-1111-4111-8111-111111111111", "porch.png");

    expect(result).toBeInstanceOf(MediaFinalizedResponse);
    expect(result).toMatchObject({
      asset: { kind: "image", mimeType: "image/png", scanStatus: "clear" },
    });
    expect(assetState.assets.get("11111111-1111-4111-8111-111111111111")).toBeDefined();
    expect(assetState.evidence).toHaveLength(1);
    expect(assetState.evidence[0]).toMatchObject({
      sourceIp: CLIENT_IP,
      sourcePort: null,
      userAgent: "test-agent",
      turnstileResult: "not_required",
    });
    expect(quotaState.usage.get(THEO.profile.id)).toMatchObject({
      bytesUsed: PNG_BYTES.length,
      filesCount: 1,
    });
  });

  test("a hash match locks the upload: refused, frozen, retained, audited", async () => {
    const { assetState, seed, finalize } = harness("match", "clear");
    seed("55555555-5555-4555-8555-555555555555", "porch.png", PNG_BYTES);

    const result = await finalize("55555555-5555-4555-8555-555555555555", "porch.png");

    expect(result).toBeInstanceOf(MediaRefusedResponse);
    const asset = assetState.assets.get("55555555-5555-4555-8555-555555555555");
    expect(asset).toMatchObject({ scanStatus: "locked" });
    expect(asset?.retainUntil).not.toBeNull();
    expect(typeof assetState.evidence[0]?.requestId).toBe("string");
    expect(assetState.auditEvents).toHaveLength(1);
    expect(assetState.auditEvents[0]).toMatchObject({ event: "media.locked" });
  });

  test("an agent with media:upload finalizes as its member, and a lock still refuses (#31)", async () => {
    const agent = {
      kind: "agent" as const,
      profile: THEO.profile,
      grant: {
        tokenId: "00000000-0000-4000-8000-0000000000f1",
        scopes: ["posts:draft", "media:upload"] as const,
      },
    };
    const clear = harness();
    clear.seed("77777777-7777-4777-8777-777777777771", "porch.png", PNG_BYTES);
    const finalized = await clear.handler.handle(
      new FinalizeUploadRequest(
        agent,
        "77777777-7777-4777-8777-777777777771",
        "porch.png",
        CLIENT_IP,
        "claude-code",
      ),
    );
    expect(finalized).toBeInstanceOf(MediaFinalizedResponse);
    expect(
      clear.assetState.assets.get("77777777-7777-4777-8777-777777777771"),
    ).toMatchObject({ owner: { kind: "member", profileId: THEO.profile.id } });
    // The envelope names the token that sent the file (SPEC.md §17).
    expect(clear.assetState.evidence[0]?.agentTokenId).toBe(agent.grant.tokenId);

    const locked = harness("match", "clear");
    locked.seed("77777777-7777-4777-8777-777777777772", "porch.png", PNG_BYTES);
    const refused = await locked.handler.handle(
      new FinalizeUploadRequest(
        agent,
        "77777777-7777-4777-8777-777777777772",
        "porch.png",
        CLIENT_IP,
        "claude-code",
      ),
    );
    expect(refused).toBeInstanceOf(MediaRefusedResponse);

    const unscoped = await clear.handler.handle(
      new FinalizeUploadRequest(
        { ...agent, grant: { ...agent.grant, scopes: ["posts:draft"] as const } },
        "77777777-7777-4777-8777-777777777771",
        "porch.png",
        CLIENT_IP,
        undefined,
      ),
    );
    expect(unscoped).toMatchObject({ reason: "not-allowed" });
  });

  test("a classifier lock (minors signal) refuses the same as a hash match", async () => {
    const { assetState, seed, finalize } = harness("clear", "locked");
    seed("66666666-6666-4666-8666-666666666666", "porch.png", PNG_BYTES);

    const result = await finalize("66666666-6666-4666-8666-666666666666", "porch.png");

    expect(result).toBeInstanceOf(MediaRefusedResponse);
    expect(assetState.assets.get("66666666-6666-4666-8666-666666666666")).toMatchObject({
      scanStatus: "locked",
    });
  });

  test("a clear image gets a re-encoded public copy with its metadata stripped (#36)", async () => {
    const { assetState, storageState, seed, finalize } = harness();
    const id = "88888888-8888-4888-8888-888888888888";
    const original = await sharp({
      create: { width: 8, height: 6, channels: 3, background: "#c9803c" },
    })
      .jpeg()
      .withExif({ IFD0: { Artist: "Theo", Copyright: "GPS-bearing original" } })
      .toBuffer();
    expect((await sharp(original).metadata()).exif).toBeDefined();
    seed(id, "porch.jpg", new Uint8Array(original));

    const result = await finalize(id, "porch.jpg");

    expect(result).toMatchObject({
      asset: { scanStatus: "clear", publishedPath: `${PUBLIC_BUCKET}/${id}.jpg` },
    });
    expect(assetState.assets.get(id)?.publishedPath).toBe(`${PUBLIC_BUCKET}/${id}.jpg`);
    const copy = storageState.objects.get(storageState.key(PUBLIC_BUCKET, `${id}.jpg`));
    if (copy === undefined) {
      throw new Error("no public copy was written");
    }
    const metadata = await sharp(copy).metadata();
    expect(metadata).toMatchObject({ format: "jpeg", width: 8, height: 6 });
    expect(metadata.exif).toBeUndefined();
  });

  test("an image that will not decode finalizes with no copy and says why (#60)", async () => {
    const { seed, finalize } = harness();
    const id = "99999999-9999-4999-8999-999999999999";
    // A PNG signature and nothing after it: the right type, but no picture to encode.
    seed(
      id,
      "porch.png",
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );

    const result = await finalize(id, "porch.png");

    expect(result).toBeInstanceOf(MediaFinalizedResponse);
    expect(result).toMatchObject({
      asset: { scanStatus: "clear", publishedPath: null },
      unpublishable: "undecodable",
    });
  });

  test("a flagged image gets no public copy until a moderator approves it", async () => {
    const { assetState, storageState, seed, finalize } = harness("clear", "flagged");
    const id = "99999999-9999-4999-8999-999999999999";
    const original = await sharp({
      create: { width: 4, height: 4, channels: 3, background: "#333333" },
    })
      .png()
      .toBuffer();
    seed(id, "study.png", new Uint8Array(original));

    await finalize(id, "study.png");

    expect(assetState.assets.get(id)?.publishedPath).toBeNull();
    expect(storageState.objects.has(storageState.key(PUBLIC_BUCKET, `${id}.png`))).toBe(
      false,
    );
  });

  test("a flagged classification finalizes but is held for review", async () => {
    const { assetState, seed, finalize } = harness("clear", "flagged");
    seed("77777777-7777-4777-8777-777777777777", "porch.png", PNG_BYTES);

    const result = await finalize("77777777-7777-4777-8777-777777777777", "porch.png");

    expect(result).toBeInstanceOf(MediaFinalizedResponse);
    expect(result).toMatchObject({ asset: { scanStatus: "flagged" } });
    expect(assetState.assets.get("77777777-7777-4777-8777-777777777777")).toMatchObject({
      retainUntil: null,
    });
    expect(assetState.auditEvents).toHaveLength(0);
  });

  test("a non-image attachment skips hash matching and image classification", async () => {
    const { seed, finalize } = harness("match", "locked");
    const text = ascii("just some notes");
    seed("88888888-8888-4888-8888-888888888888", "notes.txt", text);

    const result = await finalize("88888888-8888-4888-8888-888888888888", "notes.txt");

    expect(result).toBeInstanceOf(MediaFinalizedResponse);
    expect(result).toMatchObject({ asset: { kind: "document", scanStatus: "clear" } });
  });

  test("an SVG renamed to .png is rejected, and the quarantine object is cleaned up", async () => {
    const { storageState, assetState, seed, finalize } = harness();
    const svg = ascii('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    seed("22222222-2222-4222-8222-222222222222", "porch.png", svg);

    const result = await finalize("22222222-2222-4222-8222-222222222222", "porch.png");

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

  test("an address with a port behind a proxy splits into its own columns (#64)", async () => {
    const { handler, assetState, seed } = harness();
    seed("44444444-4444-4444-8444-444444444444", "porch.png", PNG_BYTES);

    const result = await handler.handle(
      new FinalizeUploadRequest(
        THEO,
        "44444444-4444-4444-8444-444444444444",
        "porch.png",
        `${CLIENT_IP}:51234`,
        "test-agent",
      ),
    );

    expect(result).toBeInstanceOf(MediaFinalizedResponse);
    expect(assetState.evidence[0]).toMatchObject({
      sourceIp: CLIENT_IP,
      sourcePort: 51234,
    });
  });

  test("a visitor cannot finalize a member upload", async () => {
    const { handler, seed } = harness();
    seed("33333333-3333-4333-8333-333333333333", "porch.png", PNG_BYTES);

    const result = await handler.handle(
      new FinalizeUploadRequest(
        { kind: "visitor" },
        "33333333-3333-4333-8333-333333333333",
        "porch.png",
        CLIENT_IP,
        undefined,
      ),
    );

    expect(result).toMatchObject({ reason: "signed-out" });
  });

  // A member could declare a tiny size at RequestUploadUrl time (skipping that gate)
  // and then actually PUT anything to the signed URL — finalize is the only point that
  // ever sees the real bytes, so it must be the one place the cap is actually enforced.
  test("a file whose real size is over the per-file cap is refused at finalize, and cleaned up", async () => {
    const { storageState, assetState, quotaState, seed, finalize } = harness();
    const overCap = new Uint8Array(11_000_000);
    overCap.set(PNG_BYTES);
    seed("44444444-4444-4444-8444-444444444444", "porch.png", overCap);

    const result = await finalize("44444444-4444-4444-8444-444444444444", "porch.png");

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
