import { FakeMediaAssetState } from "../../../Accessors/MediaAssetAccessor/FakeMediaAssetState";
import { FakeLoadMediaAssetByIdHandler } from "../../../Accessors/MediaAssetAccessor/Handlers/FakeLoadMediaAssetByIdHandler";
import { FakeLoadMediaAssetsByOwnerHandler } from "../../../Accessors/MediaAssetAccessor/Handlers/FakeLoadMediaAssetsByOwnerHandler";
import { FakeLoadMediaInUseHandler } from "../../../Accessors/MediaAssetAccessor/Handlers/FakeLoadMediaInUseHandler";
import { FakeLoadUnusedMediaHandler } from "../../../Accessors/MediaAssetAccessor/Handlers/FakeLoadUnusedMediaHandler";
import { FakeRemoveMediaAssetHandler } from "../../../Accessors/MediaAssetAccessor/Handlers/FakeRemoveMediaAssetHandler";
import { MediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/MediaAssetAccessor";
import { LoadMediaAssetByIdRequest } from "../../../Accessors/MediaAssetAccessor/Requests/LoadMediaAssetByIdRequest";
import { LoadMediaAssetsByOwnerRequest } from "../../../Accessors/MediaAssetAccessor/Requests/LoadMediaAssetsByOwnerRequest";
import { LoadMediaInUseRequest } from "../../../Accessors/MediaAssetAccessor/Requests/LoadMediaInUseRequest";
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
import type { Actor, AgentActor } from "../../../Common/Actor";
import type { AgentScope } from "../../../Common/AgentScope";
import { HandlerResolverBuilder } from "../../../Common/HandlerResolverBuilder";
import type { MediaAsset } from "../../../Common/MediaAsset";
import { createPermissionEngine } from "../../../Composition/createPermissionEngine";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import type { UploadStores } from "../removeUpload";

// The fakes the delete and prune tests share (#80, #90): one member's uploads, which
// of them some post or comment still shows, and a permission engine on an open site.

const AT = new Date("2026-09-27T10:00:00.000Z");

export const THEO: Actor & { kind: "member" } = {
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

export function theosAgent(scopes: readonly AgentScope[] = ["posts:draft"]): AgentActor {
  return {
    kind: "agent",
    profile: THEO.profile,
    grant: { tokenId: "t-theo", scopes },
  };
}

export function asset(id: string, overrides: Partial<MediaAsset> = {}): MediaAsset {
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

export interface FakeUploadStores {
  readonly state: FakeMediaAssetState;
  readonly stores: UploadStores;
  readonly permissions: IPermissionEngine;
}

export function fakeUploadStores(
  assets: readonly MediaAsset[],
  options: { readonly used?: readonly string[]; readonly failing?: boolean } = {},
): FakeUploadStores {
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
      .register(
        LoadMediaAssetsByOwnerRequest,
        new FakeLoadMediaAssetsByOwnerHandler(state),
      )
      .register(LoadUnusedMediaRequest, new FakeLoadUnusedMediaHandler(state))
      .register(LoadMediaInUseRequest, new FakeLoadMediaInUseHandler(state))
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
  return {
    state,
    stores: {
      storage,
      mediaAssets,
      quotas,
      options: { quarantineBucket: "quarantine", ipHashSalt: "salt" },
    },
    permissions: createPermissionEngine(siteConfig),
  };
}
