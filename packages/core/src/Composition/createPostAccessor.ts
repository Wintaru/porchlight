import { FakeLoadVoiceSamplesHandler } from "../Accessors/PostAccessor/Handlers/FakeLoadVoiceSamplesHandler";
import { SupabaseLoadVoiceSamplesHandler } from "../Accessors/PostAccessor/Handlers/SupabaseLoadVoiceSamplesHandler";
import { LoadVoiceSamplesRequest } from "../Accessors/PostAccessor/Requests/LoadVoiceSamplesRequest";
import type { DbClient } from "@porchlight/db";

import { FakePostState } from "../Accessors/PostAccessor/FakePostState";
import { FakeLoadPostByIdHandler } from "../Accessors/PostAccessor/Handlers/FakeLoadPostByIdHandler";
import { FakeLoadPostBySlugHandler } from "../Accessors/PostAccessor/Handlers/FakeLoadPostBySlugHandler";
import { FakeLoadPostsByAuthorHandler } from "../Accessors/PostAccessor/Handlers/FakeLoadPostsByAuthorHandler";
import { FakeLoadPostsByStatusHandler } from "../Accessors/PostAccessor/Handlers/FakeLoadPostsByStatusHandler";
import { FakeRemovePostHandler } from "../Accessors/PostAccessor/Handlers/FakeRemovePostHandler";
import { FakeStoreNewPostHandler } from "../Accessors/PostAccessor/Handlers/FakeStoreNewPostHandler";
import { FakeStorePostChangesHandler } from "../Accessors/PostAccessor/Handlers/FakeStorePostChangesHandler";
import { SupabaseLoadPostByIdHandler } from "../Accessors/PostAccessor/Handlers/SupabaseLoadPostByIdHandler";
import { SupabaseLoadPostBySlugHandler } from "../Accessors/PostAccessor/Handlers/SupabaseLoadPostBySlugHandler";
import { SupabaseLoadPostsByAuthorHandler } from "../Accessors/PostAccessor/Handlers/SupabaseLoadPostsByAuthorHandler";
import { SupabaseLoadPostsByStatusHandler } from "../Accessors/PostAccessor/Handlers/SupabaseLoadPostsByStatusHandler";
import { SupabaseRemovePostHandler } from "../Accessors/PostAccessor/Handlers/SupabaseRemovePostHandler";
import { SupabaseStoreNewPostHandler } from "../Accessors/PostAccessor/Handlers/SupabaseStoreNewPostHandler";
import { SupabaseStorePostChangesHandler } from "../Accessors/PostAccessor/Handlers/SupabaseStorePostChangesHandler";
import type { IPostAccessor } from "../Accessors/PostAccessor/IPostAccessor";
import { PostAccessor } from "../Accessors/PostAccessor/PostAccessor";
import { LoadPostByIdRequest } from "../Accessors/PostAccessor/Requests/LoadPostByIdRequest";
import { LoadPostBySlugRequest } from "../Accessors/PostAccessor/Requests/LoadPostBySlugRequest";
import { LoadPostsByAuthorRequest } from "../Accessors/PostAccessor/Requests/LoadPostsByAuthorRequest";
import { LoadPostsByStatusRequest } from "../Accessors/PostAccessor/Requests/LoadPostsByStatusRequest";
import { RemovePostRequest } from "../Accessors/PostAccessor/Requests/RemovePostRequest";
import { StoreNewPostRequest } from "../Accessors/PostAccessor/Requests/StoreNewPostRequest";
import { StorePostChangesRequest } from "../Accessors/PostAccessor/Requests/StorePostChangesRequest";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import type { Environment } from "./Environment";
import { readFakeResult, readStoreProvider } from "./readStoreProvider";

// The store behind every post read and write (SPEC.md §5).
export function createPostAccessor(env: Environment, db: () => DbClient): IPostAccessor {
  switch (readStoreProvider(env, "POST_PROVIDER")) {
    case "supabase":
      return createSupabasePostAccessor(db());
    case "fake":
      return createFakePostAccessor(
        new FakePostState(readFakeResult(env, "POST_FAKE_RESULT") === "fail"),
      );
  }
}

function createSupabasePostAccessor(db: DbClient): IPostAccessor {
  return new PostAccessor(
    new HandlerResolverBuilder()
      .register(StoreNewPostRequest, new SupabaseStoreNewPostHandler(db))
      .register(StorePostChangesRequest, new SupabaseStorePostChangesHandler(db))
      .build(),
    new HandlerResolverBuilder()
      .register(LoadPostByIdRequest, new SupabaseLoadPostByIdHandler(db))
      .register(LoadPostBySlugRequest, new SupabaseLoadPostBySlugHandler(db))
      .register(LoadPostsByAuthorRequest, new SupabaseLoadPostsByAuthorHandler(db))
      .register(LoadVoiceSamplesRequest, new SupabaseLoadVoiceSamplesHandler(db))
      .register(LoadPostsByStatusRequest, new SupabaseLoadPostsByStatusHandler(db))
      .build(),
    new HandlerResolverBuilder()
      .register(RemovePostRequest, new SupabaseRemovePostHandler(db))
      .build(),
  );
}

function createFakePostAccessor(state: FakePostState): IPostAccessor {
  return new PostAccessor(
    new HandlerResolverBuilder()
      .register(StoreNewPostRequest, new FakeStoreNewPostHandler(state))
      .register(StorePostChangesRequest, new FakeStorePostChangesHandler(state))
      .build(),
    new HandlerResolverBuilder()
      .register(LoadPostByIdRequest, new FakeLoadPostByIdHandler(state))
      .register(LoadPostBySlugRequest, new FakeLoadPostBySlugHandler(state))
      .register(LoadPostsByAuthorRequest, new FakeLoadPostsByAuthorHandler(state))
      .register(LoadVoiceSamplesRequest, new FakeLoadVoiceSamplesHandler(state))
      .register(LoadPostsByStatusRequest, new FakeLoadPostsByStatusHandler(state))
      .build(),
    new HandlerResolverBuilder()
      .register(RemovePostRequest, new FakeRemovePostHandler(state))
      .build(),
  );
}
