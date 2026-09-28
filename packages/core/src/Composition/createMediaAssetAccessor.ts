import type { DbClient } from "@porchlight/db";

import { FakeMediaAssetState } from "../Accessors/MediaAssetAccessor/FakeMediaAssetState";
import { FakeCountMediaForAnonymousAuthorHandler } from "../Accessors/MediaAssetAccessor/Handlers/FakeCountMediaForAnonymousAuthorHandler";
import { FakeLoadHeldMediaHandler } from "../Accessors/MediaAssetAccessor/Handlers/FakeLoadHeldMediaHandler";
import { FakeLoadMediaAssetByIdHandler } from "../Accessors/MediaAssetAccessor/Handlers/FakeLoadMediaAssetByIdHandler";
import { FakeLoadMediaAssetsByOwnerHandler } from "../Accessors/MediaAssetAccessor/Handlers/FakeLoadMediaAssetsByOwnerHandler";
import { FakeLoadMediaInUseHandler } from "../Accessors/MediaAssetAccessor/Handlers/FakeLoadMediaInUseHandler";
import { FakeLoadUnusedMediaHandler } from "../Accessors/MediaAssetAccessor/Handlers/FakeLoadUnusedMediaHandler";
import { FakeRemoveMediaAssetHandler } from "../Accessors/MediaAssetAccessor/Handlers/FakeRemoveMediaAssetHandler";
import { FakeStoreMediaAssetChangesHandler } from "../Accessors/MediaAssetAccessor/Handlers/FakeStoreMediaAssetChangesHandler";
import { FakeStoreNewMediaAssetHandler } from "../Accessors/MediaAssetAccessor/Handlers/FakeStoreNewMediaAssetHandler";
import { SupabaseCountMediaForAnonymousAuthorHandler } from "../Accessors/MediaAssetAccessor/Handlers/SupabaseCountMediaForAnonymousAuthorHandler";
import { SupabaseLoadHeldMediaHandler } from "../Accessors/MediaAssetAccessor/Handlers/SupabaseLoadHeldMediaHandler";
import { SupabaseLoadMediaAssetByIdHandler } from "../Accessors/MediaAssetAccessor/Handlers/SupabaseLoadMediaAssetByIdHandler";
import { SupabaseLoadMediaAssetsByOwnerHandler } from "../Accessors/MediaAssetAccessor/Handlers/SupabaseLoadMediaAssetsByOwnerHandler";
import { SupabaseLoadMediaInUseHandler } from "../Accessors/MediaAssetAccessor/Handlers/SupabaseLoadMediaInUseHandler";
import { SupabaseLoadUnusedMediaHandler } from "../Accessors/MediaAssetAccessor/Handlers/SupabaseLoadUnusedMediaHandler";
import { SupabaseRemoveMediaAssetHandler } from "../Accessors/MediaAssetAccessor/Handlers/SupabaseRemoveMediaAssetHandler";
import { SupabaseStoreMediaAssetChangesHandler } from "../Accessors/MediaAssetAccessor/Handlers/SupabaseStoreMediaAssetChangesHandler";
import { SupabaseStoreNewMediaAssetHandler } from "../Accessors/MediaAssetAccessor/Handlers/SupabaseStoreNewMediaAssetHandler";
import type { IMediaAssetAccessor } from "../Accessors/MediaAssetAccessor/IMediaAssetAccessor";
import { MediaAssetAccessor } from "../Accessors/MediaAssetAccessor/MediaAssetAccessor";
import { CountMediaForAnonymousAuthorRequest } from "../Accessors/MediaAssetAccessor/Requests/CountMediaForAnonymousAuthorRequest";
import { LoadHeldMediaRequest } from "../Accessors/MediaAssetAccessor/Requests/LoadHeldMediaRequest";
import { LoadMediaAssetByIdRequest } from "../Accessors/MediaAssetAccessor/Requests/LoadMediaAssetByIdRequest";
import { LoadMediaAssetsByOwnerRequest } from "../Accessors/MediaAssetAccessor/Requests/LoadMediaAssetsByOwnerRequest";
import { LoadMediaInUseRequest } from "../Accessors/MediaAssetAccessor/Requests/LoadMediaInUseRequest";
import { LoadUnusedMediaRequest } from "../Accessors/MediaAssetAccessor/Requests/LoadUnusedMediaRequest";
import { RemoveMediaAssetRequest } from "../Accessors/MediaAssetAccessor/Requests/RemoveMediaAssetRequest";
import { StoreMediaAssetChangesRequest } from "../Accessors/MediaAssetAccessor/Requests/StoreMediaAssetChangesRequest";
import { StoreNewMediaAssetRequest } from "../Accessors/MediaAssetAccessor/Requests/StoreNewMediaAssetRequest";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import type { Environment } from "./Environment";
import { readFakeResult, readStoreProvider } from "./readStoreProvider";

// The store behind every upload's own row (SPEC.md §6, §7).
export function createMediaAssetAccessor(
  env: Environment,
  db: () => DbClient,
): IMediaAssetAccessor {
  switch (readStoreProvider(env, "MEDIA_PROVIDER")) {
    case "supabase":
      return createSupabaseMediaAssetAccessor(db());
    case "fake":
      return createFakeMediaAssetAccessor(
        new FakeMediaAssetState(readFakeResult(env, "MEDIA_FAKE_RESULT") === "fail"),
      );
  }
}

function createSupabaseMediaAssetAccessor(db: DbClient): IMediaAssetAccessor {
  return new MediaAssetAccessor(
    new HandlerResolverBuilder()
      .register(StoreNewMediaAssetRequest, new SupabaseStoreNewMediaAssetHandler(db))
      .register(
        StoreMediaAssetChangesRequest,
        new SupabaseStoreMediaAssetChangesHandler(db),
      )
      .build(),
    new HandlerResolverBuilder()
      .register(LoadMediaAssetByIdRequest, new SupabaseLoadMediaAssetByIdHandler(db))
      .register(
        LoadMediaAssetsByOwnerRequest,
        new SupabaseLoadMediaAssetsByOwnerHandler(db),
      )
      .register(
        CountMediaForAnonymousAuthorRequest,
        new SupabaseCountMediaForAnonymousAuthorHandler(db),
      )
      .register(LoadUnusedMediaRequest, new SupabaseLoadUnusedMediaHandler(db))
      .register(LoadMediaInUseRequest, new SupabaseLoadMediaInUseHandler(db))
      .register(LoadHeldMediaRequest, new SupabaseLoadHeldMediaHandler(db))
      .build(),
    new HandlerResolverBuilder()
      .register(RemoveMediaAssetRequest, new SupabaseRemoveMediaAssetHandler(db))
      .build(),
  );
}

export function createFakeMediaAssetAccessor(
  state: FakeMediaAssetState,
): IMediaAssetAccessor {
  return new MediaAssetAccessor(
    new HandlerResolverBuilder()
      .register(StoreNewMediaAssetRequest, new FakeStoreNewMediaAssetHandler(state))
      .register(
        StoreMediaAssetChangesRequest,
        new FakeStoreMediaAssetChangesHandler(state),
      )
      .build(),
    new HandlerResolverBuilder()
      .register(LoadMediaAssetByIdRequest, new FakeLoadMediaAssetByIdHandler(state))
      .register(
        LoadMediaAssetsByOwnerRequest,
        new FakeLoadMediaAssetsByOwnerHandler(state),
      )
      .register(
        CountMediaForAnonymousAuthorRequest,
        new FakeCountMediaForAnonymousAuthorHandler(state),
      )
      .register(LoadUnusedMediaRequest, new FakeLoadUnusedMediaHandler(state))
      .register(LoadMediaInUseRequest, new FakeLoadMediaInUseHandler(state))
      .register(LoadHeldMediaRequest, new FakeLoadHeldMediaHandler(state))
      .build(),
    new HandlerResolverBuilder()
      .register(RemoveMediaAssetRequest, new FakeRemoveMediaAssetHandler(state))
      .build(),
  );
}
