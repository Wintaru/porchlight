import { describe, expect, test } from "vitest";

import { FakeMediaAssetState } from "../../../Accessors/MediaAssetAccessor/FakeMediaAssetState";
import { FakeLoadMediaAssetByIdHandler } from "../../../Accessors/MediaAssetAccessor/Handlers/FakeLoadMediaAssetByIdHandler";
import { FakeLoadUnusedMediaHandler } from "../../../Accessors/MediaAssetAccessor/Handlers/FakeLoadUnusedMediaHandler";
import { FakeRemoveMediaAssetHandler } from "../../../Accessors/MediaAssetAccessor/Handlers/FakeRemoveMediaAssetHandler";
import { MediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/MediaAssetAccessor";
import { LoadMediaAssetByIdRequest } from "../../../Accessors/MediaAssetAccessor/Requests/LoadMediaAssetByIdRequest";
import { LoadUnusedMediaRequest } from "../../../Accessors/MediaAssetAccessor/Requests/LoadUnusedMediaRequest";
import { RemoveMediaAssetRequest } from "../../../Accessors/MediaAssetAccessor/Requests/RemoveMediaAssetRequest";
import { FakeMediaStorageState } from "../../../Accessors/MediaStorageAccessor/FakeMediaStorageState";
import { FakeRemoveStorageObjectHandler } from "../../../Accessors/MediaStorageAccessor/Handlers/FakeRemoveStorageObjectHandler";
import { MediaStorageAccessor } from "../../../Accessors/MediaStorageAccessor/MediaStorageAccessor";
import { RemoveStorageObjectRequest } from "../../../Accessors/MediaStorageAccessor/Requests/RemoveStorageObjectRequest";
import { FakeQuotaState } from "../../../Accessors/QuotaAccessor/FakeQuotaState";
import { FakeAdjustQuotaUsageHandler } from "../../../Accessors/QuotaAccessor/Handlers/FakeAdjustQuotaUsageHandler";
import { QuotaAccessor } from "../../../Accessors/QuotaAccessor/QuotaAccessor";
import { AdjustQuotaUsageRequest } from "../../../Accessors/QuotaAccessor/Requests/AdjustQuotaUsageRequest";
import { FakeSiteConfigState } from "../../../Accessors/SiteConfigAccessor/FakeSiteConfigState";
import { FakeLoadAgentsPolicyHandler } from "../../../Accessors/SiteConfigAccessor/Handlers/FakeLoadAgentsPolicyHandler";
import { LoadAgentsPolicyRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadAgentsPolicyRequest";
import { SiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/SiteConfigAccessor";
import type { Actor } from "../../../Common/Actor";
import { HandlerResolverBuilder } from "../../../Common/HandlerResolverBuilder";
import type { MediaAsset } from "../../../Common/MediaAsset";
import { createPermissionEngine } from "../../../Composition/createPermissionEngine";
import { PruneMediaRequest } from "../Requests/PruneMediaRequest";
import { MediaPrunedResponse } from "../Responses/MediaPrunedResponse";
import { MediaUnavailableResponse } from "../Responses/MediaUnavailableResponse";
import { DeleteMediaHandler } from "./DeleteMediaHandler";
import { PruneMediaHandler } from "./PruneMediaHandler";

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

function asset(id: string, overrides: Partial<MediaAsset> = {}): MediaAsset {
  return {
    id,
    owner: { kind: "member", profileId: THEO.profile.id },
    storagePath: `members/u-theo/${id}.png`,
    publishedPath: null,
    kind: "image",
    mimeType: "image/png",
    originalFilename: `${id}.png`,
    bytes: 10,
    sha256: "a".repeat(64),
    scanStatus: "clear",
    mature: false,
    postId: "p-porch",
    usedInPost: true,
    rejectedAt: null,
    retainUntil: null,
    createdAt: AT,
    updatedAt: AT,
    ...overrides,
  };
}

function prune(
  assets: readonly MediaAsset[],
  options: { readonly used?: readonly string[]; readonly failing?: boolean } = {},
) {
  const state = new FakeMediaAssetState(options.failing ?? false);
  for (const a of assets) {
    state.assets.set(a.id, a);
  }
  for (const id of options.used ?? []) {
    state.usedMediaIds.add(id);
  }
  const mediaAssets = new MediaAssetAccessor(
    new HandlerResolverBuilder().build(),
    new HandlerResolverBuilder()
      .register(LoadMediaAssetByIdRequest, new FakeLoadMediaAssetByIdHandler(state))
      .register(LoadUnusedMediaRequest, new FakeLoadUnusedMediaHandler(state))
      .build(),
    new HandlerResolverBuilder()
      .register(RemoveMediaAssetRequest, new FakeRemoveMediaAssetHandler(state))
      .build(),
  );
  const storage = new MediaStorageAccessor(
    new HandlerResolverBuilder().build(),
    new HandlerResolverBuilder().build(),
    new HandlerResolverBuilder()
      .register(
        RemoveStorageObjectRequest,
        new FakeRemoveStorageObjectHandler(new FakeMediaStorageState()),
      )
      .build(),
  );
  const quotas = new QuotaAccessor(
    new HandlerResolverBuilder().build(),
    new HandlerResolverBuilder()
      .register(
        AdjustQuotaUsageRequest,
        new FakeAdjustQuotaUsageHandler(new FakeQuotaState()),
      )
      .build(),
  );
  const siteConfig = new SiteConfigAccessor(
    new HandlerResolverBuilder().build(),
    new HandlerResolverBuilder()
      .register(
        LoadAgentsPolicyRequest,
        new FakeLoadAgentsPolicyHandler(new FakeSiteConfigState("anyone", "anyone")),
      )
      .build(),
  );
  const handler = new PruneMediaHandler(
    mediaAssets,
    new DeleteMediaHandler(
      storage,
      mediaAssets,
      quotas,
      createPermissionEngine(siteConfig),
      {
        quarantineBucket: "quarantine",
        ipHashSalt: "salt",
      },
    ),
  );
  const ids = assets.map((a) => a.id);
  return { state, result: handler.handle(new PruneMediaRequest(THEO, ids, "p-porch")) };
}

describe("PruneMediaHandler", () => {
  test("deletes the named uploads no post uses, and keeps the used ones", async () => {
    const { state, result } = prune([asset("gone"), asset("kept")], { used: ["kept"] });

    const pruned = (await result) as MediaPrunedResponse;
    expect(pruned).toBeInstanceOf(MediaPrunedResponse);
    expect(pruned.deletedIds).toEqual(["gone"]);
    expect(state.assets.has("gone")).toBe(false);
    expect(state.assets.has("kept")).toBe(true);
  });

  test("never deletes someone else's upload", async () => {
    const theirs = asset("theirs", { owner: { kind: "member", profileId: "u-ivy" } });
    const { state, result } = prune([theirs]);

    expect(((await result) as MediaPrunedResponse).deletedIds).toEqual([]);
    expect(state.assets.has("theirs")).toBe(true);
  });

  test("a retained upload stays, and is reported kept", async () => {
    const locked = asset("locked", {
      scanStatus: "locked",
      retainUntil: new Date(Date.now() + 86_400_000),
    });
    const { state, result } = prune([locked]);

    expect(((await result) as MediaPrunedResponse).keptIds).toEqual(["locked"]);
    expect(state.assets.has("locked")).toBe(true);
  });

  test("a store it cannot read deletes nothing", async () => {
    const { result } = prune([asset("gone")], { failing: true });

    expect(await result).toBeInstanceOf(MediaUnavailableResponse);
  });
});
