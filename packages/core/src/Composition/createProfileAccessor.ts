import { FakeLoadVoiceGuideHandler } from "../Accessors/ProfileAccessor/Handlers/FakeLoadVoiceGuideHandler";
import { FakeStoreVoiceGuideHandler } from "../Accessors/ProfileAccessor/Handlers/FakeStoreVoiceGuideHandler";
import { SupabaseLoadVoiceGuideHandler } from "../Accessors/ProfileAccessor/Handlers/SupabaseLoadVoiceGuideHandler";
import { SupabaseStoreVoiceGuideHandler } from "../Accessors/ProfileAccessor/Handlers/SupabaseStoreVoiceGuideHandler";
import { LoadVoiceGuideRequest } from "../Accessors/ProfileAccessor/Requests/LoadVoiceGuideRequest";
import { StoreVoiceGuideRequest } from "../Accessors/ProfileAccessor/Requests/StoreVoiceGuideRequest";
import type { DbClient } from "@porchlight/db";

import { FakeProfileState } from "../Accessors/ProfileAccessor/FakeProfileState";
import { FakeCountProfilesHandler } from "../Accessors/ProfileAccessor/Handlers/FakeCountProfilesHandler";
import { FakeEraseProfileHandler } from "../Accessors/ProfileAccessor/Handlers/FakeEraseProfileHandler";
import { FakeListStaffProfilesHandler } from "../Accessors/ProfileAccessor/Handlers/FakeListStaffProfilesHandler";
import { FakeLoadProfileByHandleHandler } from "../Accessors/ProfileAccessor/Handlers/FakeLoadProfileByHandleHandler";
import { FakeLoadProfileByIdHandler } from "../Accessors/ProfileAccessor/Handlers/FakeLoadProfileByIdHandler";
import { FakeStoreNewProfileHandler } from "../Accessors/ProfileAccessor/Handlers/FakeStoreNewProfileHandler";
import { FakeStoreProfileChangesHandler } from "../Accessors/ProfileAccessor/Handlers/FakeStoreProfileChangesHandler";
import { SupabaseCountProfilesHandler } from "../Accessors/ProfileAccessor/Handlers/SupabaseCountProfilesHandler";
import { SupabaseEraseProfileHandler } from "../Accessors/ProfileAccessor/Handlers/SupabaseEraseProfileHandler";
import { SupabaseListStaffProfilesHandler } from "../Accessors/ProfileAccessor/Handlers/SupabaseListStaffProfilesHandler";
import { SupabaseLoadProfileByHandleHandler } from "../Accessors/ProfileAccessor/Handlers/SupabaseLoadProfileByHandleHandler";
import { SupabaseLoadProfileByIdHandler } from "../Accessors/ProfileAccessor/Handlers/SupabaseLoadProfileByIdHandler";
import { SupabaseStoreNewProfileHandler } from "../Accessors/ProfileAccessor/Handlers/SupabaseStoreNewProfileHandler";
import { SupabaseStoreProfileChangesHandler } from "../Accessors/ProfileAccessor/Handlers/SupabaseStoreProfileChangesHandler";
import type { IProfileAccessor } from "../Accessors/ProfileAccessor/IProfileAccessor";
import { ProfileAccessor } from "../Accessors/ProfileAccessor/ProfileAccessor";
import { CountProfilesRequest } from "../Accessors/ProfileAccessor/Requests/CountProfilesRequest";
import { EraseProfileRequest } from "../Accessors/ProfileAccessor/Requests/EraseProfileRequest";
import { ListStaffProfilesRequest } from "../Accessors/ProfileAccessor/Requests/ListStaffProfilesRequest";
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
      .register(EraseProfileRequest, new SupabaseEraseProfileHandler(db))
      .register(StoreVoiceGuideRequest, new SupabaseStoreVoiceGuideHandler(db))
      .build(),
    new HandlerResolverBuilder()
      .register(LoadProfileByIdRequest, new SupabaseLoadProfileByIdHandler(db))
      .register(LoadProfileByHandleRequest, new SupabaseLoadProfileByHandleHandler(db))
      .register(CountProfilesRequest, new SupabaseCountProfilesHandler(db))
      .register(ListStaffProfilesRequest, new SupabaseListStaffProfilesHandler(db))
      .register(LoadVoiceGuideRequest, new SupabaseLoadVoiceGuideHandler(db))
      .build(),
  );
}

// Exported for the Manager tests that need a profile store beside another fake.
export function createFakeProfileAccessor(state: FakeProfileState): IProfileAccessor {
  return new ProfileAccessor(
    new HandlerResolverBuilder()
      .register(StoreNewProfileRequest, new FakeStoreNewProfileHandler(state))
      .register(StoreProfileChangesRequest, new FakeStoreProfileChangesHandler(state))
      .register(EraseProfileRequest, new FakeEraseProfileHandler(state))
      .register(StoreVoiceGuideRequest, new FakeStoreVoiceGuideHandler(state))
      .build(),
    new HandlerResolverBuilder()
      .register(LoadProfileByIdRequest, new FakeLoadProfileByIdHandler(state))
      .register(LoadProfileByHandleRequest, new FakeLoadProfileByHandleHandler(state))
      .register(CountProfilesRequest, new FakeCountProfilesHandler(state))
      .register(ListStaffProfilesRequest, new FakeListStaffProfilesHandler(state))
      .register(LoadVoiceGuideRequest, new FakeLoadVoiceGuideHandler(state))
      .build(),
  );
}
