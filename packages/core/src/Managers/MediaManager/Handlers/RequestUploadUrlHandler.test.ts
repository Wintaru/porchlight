import { describe, expect, test } from "vitest";

import { FakeMediaStorageState } from "../../../Accessors/MediaStorageAccessor/FakeMediaStorageState";
import { FakeCreateSignedUploadUrlHandler } from "../../../Accessors/MediaStorageAccessor/Handlers/FakeCreateSignedUploadUrlHandler";
import { MediaStorageAccessor } from "../../../Accessors/MediaStorageAccessor/MediaStorageAccessor";
import { CreateSignedUploadUrlRequest } from "../../../Accessors/MediaStorageAccessor/Requests/CreateSignedUploadUrlRequest";
import { FakeQuotaState } from "../../../Accessors/QuotaAccessor/FakeQuotaState";
import { FakeLoadQuotaUsageHandler } from "../../../Accessors/QuotaAccessor/Handlers/FakeLoadQuotaUsageHandler";
import { QuotaAccessor } from "../../../Accessors/QuotaAccessor/QuotaAccessor";
import { LoadQuotaUsageRequest } from "../../../Accessors/QuotaAccessor/Requests/LoadQuotaUsageRequest";
import { FakeSiteConfigState } from "../../../Accessors/SiteConfigAccessor/FakeSiteConfigState";
import { FakeLoadAttachmentAllowlistHandler } from "../../../Accessors/SiteConfigAccessor/Handlers/FakeLoadAttachmentAllowlistHandler";
import { FakeLoadAttachmentQuotaByTrustHandler } from "../../../Accessors/SiteConfigAccessor/Handlers/FakeLoadAttachmentQuotaByTrustHandler";
import { SiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/SiteConfigAccessor";
import { LoadAttachmentAllowlistRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadAttachmentAllowlistRequest";
import { LoadAttachmentQuotaByTrustRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadAttachmentQuotaByTrustRequest";
import type { Actor } from "../../../Common/Actor";
import { HandlerResolverBuilder } from "../../../Common/HandlerResolverBuilder";
import type { AttachmentQuotaByTrust } from "../../../Common/AttachmentQuota";
import { createPermissionEngine } from "../../../Composition/createPermissionEngine";
import { createQuotaEngine } from "../../../Composition/createQuotaEngine";
import { RequestUploadUrlRequest } from "../Requests/RequestUploadUrlRequest";
import { MediaQuotaExceededResponse } from "../Responses/MediaQuotaExceededResponse";
import { MediaRejectedResponse } from "../Responses/MediaRejectedResponse";
import { UploadUrlIssuedResponse } from "../Responses/UploadUrlIssuedResponse";
import { RequestUploadUrlHandler } from "./RequestUploadUrlHandler";

const AT = new Date("2026-09-12T10:00:00.000Z");
const QUOTA_BY_TRUST: AttachmentQuotaByTrust = {
  probation: { maxFileBytes: 1_000_000, maxAccountBytes: 2_000_000 },
  trusted: { maxFileBytes: 10_000_000, maxAccountBytes: 100_000_000 },
};

function member(trustLevel: "probation" | "trusted"): Actor {
  return {
    kind: "member",
    profile: {
      id: "u-june",
      handle: "june",
      displayName: null,
      avatarUrl: null,
      bio: null,
      role: "member",
      trustLevel,
      status: "active",
      createdAt: AT,
    },
  };
}

function harness(quotaState: FakeQuotaState) {
  const storage = new MediaStorageAccessor(
    new HandlerResolverBuilder()
      .register(
        CreateSignedUploadUrlRequest,
        new FakeCreateSignedUploadUrlHandler(new FakeMediaStorageState()),
      )
      .build(),
    new HandlerResolverBuilder().build(),
    new HandlerResolverBuilder().build(),
  );
  const quotas = new QuotaAccessor(
    new HandlerResolverBuilder()
      .register(LoadQuotaUsageRequest, new FakeLoadQuotaUsageHandler(quotaState))
      .build(),
    new HandlerResolverBuilder().build(),
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
      .build(),
  );
  const permissions = createPermissionEngine(siteConfig);
  const quotaEngine = createQuotaEngine();
  return new RequestUploadUrlHandler(
    storage,
    quotas,
    siteConfig,
    permissions,
    quotaEngine,
    {
      quarantineBucket: "quarantine",
      ipHashSalt: "test-salt",
    },
  );
}

describe("RequestUploadUrlHandler", () => {
  test("a well-formed request under quota gets a signed upload URL", async () => {
    const handler = harness(new FakeQuotaState());

    const result = await handler.handle(
      new RequestUploadUrlRequest(member("trusted"), "porch.png", 500_000),
    );

    expect(result).toBeInstanceOf(UploadUrlIssuedResponse);
    if (result instanceof UploadUrlIssuedResponse) {
      expect(result.path).toContain("u-june");
    }
  });

  test("a disallowed extension is rejected before any URL is signed", async () => {
    const handler = harness(new FakeQuotaState());

    const result = await handler.handle(
      new RequestUploadUrlRequest(member("trusted"), "malware.exe", 500),
    );

    expect(result).toBeInstanceOf(MediaRejectedResponse);
    expect(result).toMatchObject({ reason: "extension-not-allowed" });
  });

  test("a probation member over the account cap sees the cap, not a generic failure", async () => {
    const quotaState = new FakeQuotaState();
    quotaState.usage.set("u-june", { bytesUsed: 1_800_000, filesCount: 5 });
    const handler = harness(quotaState);

    const result = await handler.handle(
      new RequestUploadUrlRequest(member("probation"), "porch.png", 500_000),
    );

    expect(result).toBeInstanceOf(MediaQuotaExceededResponse);
    expect(result).toMatchObject({ reason: "account-cap", limit: 2_000_000 });
  });

  test("a single file over the per-file cap is rejected even with room in the account", async () => {
    const handler = harness(new FakeQuotaState());

    const result = await handler.handle(
      new RequestUploadUrlRequest(member("probation"), "porch.png", 1_500_000),
    );

    expect(result).toMatchObject({ reason: "file-too-large", limit: 1_000_000 });
  });

  test("a visitor may not request a member upload URL", async () => {
    const handler = harness(new FakeQuotaState());

    const result = await handler.handle(
      new RequestUploadUrlRequest({ kind: "visitor" }, "porch.png", 500),
    );

    expect(result).toMatchObject({ reason: "signed-out" });
  });
});
