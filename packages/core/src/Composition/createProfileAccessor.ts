import type { DbClient } from "@porchlight/db";

import { FakeProfileState } from "../Accessors/ProfileAccessor/FakeProfileState";
import { FakeCountProfilesHandler } from "../Accessors/ProfileAccessor/Handlers/FakeCountProfilesHandler";
import { FakeLoadProfileByHandleHandler } from "../Accessors/ProfileAccessor/Handlers/FakeLoadProfileByHandleHandler";
import { FakeLoadProfileByIdHandler } from "../Accessors/ProfileAccessor/Handlers/FakeLoadProfileByIdHandler";
import { FakeStoreNewProfileHandler } from "../Accessors/ProfileAccessor/Handlers/FakeStoreNewProfileHandler";
import { FakeStoreProfileChangesHandler } from "../Accessors/ProfileAccessor/Handlers/FakeStoreProfileChangesHandler";
import { SupabaseCountProfilesHandler } from "../Accessors/ProfileAccessor/Handlers/SupabaseCountProfilesHandler";
import { SupabaseLoadProfileByHandleHandler } from "../Accessors/ProfileAccessor/Handlers/SupabaseLoadProfileByHandleHandler";
import { SupabaseLoadProfileByIdHandler } from "../Accessors/ProfileAccessor/Handlers/SupabaseLoadProfileByIdHandler";
import { SupabaseStoreNewProfileHandler } from "../Accessors/ProfileAccessor/Handlers/SupabaseStoreNewProfileHandler";
import { SupabaseStoreProfileChangesHandler } from "../Accessors/ProfileAccessor/Handlers/SupabaseStoreProfileChangesHandler";
import type { IProfileAccessor } from "../Accessors/ProfileAccessor/IProfileAccessor";
import { ProfileAccessor } from "../Accessors/ProfileAccessor/ProfileAccessor";
import { CountProfilesRequest } from "../Accessors/ProfileAccessor/Requests/CountProfilesRequest";
import { LoadProfileByHandleRequest } from "../Accessors/ProfileAccessor/Requests/LoadProfileByHandleRequest";
import { LoadProfileByIdRequest } from "../Accessors/ProfileAccessor/Requests/LoadProfileByIdRequest";
import { StoreNewProfileRequest } from "../Accessors/ProfileAccessor/Requests/StoreNewProfileRequest";
import { StoreProfileChangesRequest } from "../Accessors/ProfileAccessor/Requests/StoreProfileChangesRequest";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import type { Environment } from "./Environment";
import { readFakeResult, readStoreProvider } from "./readStoreProvider";

// The store behind every profile read and write. `db` is built lazily: the fake
// provider must not need the Supabase keys.
export function createProfileAccessor(
  env: Environment,
  db: () => DbClient,
): IProfileAccessor {
  switch (readStoreProvider(env, "PROFILE_PROVIDER")) {
    case "supabase":
      return createSupabaseProfileAccessor(db());
    case "fake":
      return createFakeProfileAccessor(
        new FakeProfileState(readFakeResult(env, "PROFILE_FAKE_RESULT") === "fail"),
      );
  }
}

function createSupabaseProfileAccessor(db: DbClient): IProfileAccessor {
  return new ProfileAccessor(
    new HandlerResolverBuilder()
      .register(StoreNewProfileRequest, new SupabaseStoreNewProfileHandler(db))
      .register(StoreProfileChangesRequest, new SupabaseStoreProfileChangesHandler(db))
      .build(),
    new HandlerResolverBuilder()
      .register(LoadProfileByIdRequest, new SupabaseLoadProfileByIdHandler(db))
      .register(LoadProfileByHandleRequest, new SupabaseLoadProfileByHandleHandler(db))
      .register(CountProfilesRequest, new SupabaseCountProfilesHandler(db))
      .build(),
  );
}

function createFakeProfileAccessor(state: FakeProfileState): IProfileAccessor {
  return new ProfileAccessor(
    new HandlerResolverBuilder()
      .register(StoreNewProfileRequest, new FakeStoreNewProfileHandler(state))
      .register(StoreProfileChangesRequest, new FakeStoreProfileChangesHandler(state))
      .build(),
    new HandlerResolverBuilder()
      .register(LoadProfileByIdRequest, new FakeLoadProfileByIdHandler(state))
      .register(LoadProfileByHandleRequest, new FakeLoadProfileByHandleHandler(state))
      .register(CountProfilesRequest, new FakeCountProfilesHandler(state))
      .build(),
  );
}
