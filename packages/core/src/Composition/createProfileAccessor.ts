import { createDbClient, type DbClient } from "@porchlight/db";

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

// The store behind every profile read and write. `supabase` is the default and needs the
// two keys below; a missing key throws at startup rather than falling back, so a
// deployment never runs on an in-memory store by accident. `fake` is for tests and for
// a Client that must not touch the stack (D19).
const PROFILE_PROVIDERS = ["supabase", "fake"] as const;
type ProfileProvider = (typeof PROFILE_PROVIDERS)[number];
const DEFAULT_PROVIDER: ProfileProvider = "supabase";

const FAKE_RESULTS = ["ok", "fail"] as const;
type FakeResult = (typeof FAKE_RESULTS)[number];
const DEFAULT_FAKE_RESULT: FakeResult = "ok";

function isProfileProvider(value: string): value is ProfileProvider {
  return PROFILE_PROVIDERS.some((provider) => provider === value);
}

function isFakeResult(value: string): value is FakeResult {
  return FAKE_RESULTS.some((result) => result === value);
}

export function createProfileAccessor(env: Environment): IProfileAccessor {
  const provider = env.PROFILE_PROVIDER ?? DEFAULT_PROVIDER;
  if (!isProfileProvider(provider)) {
    throw new Error(
      `PROFILE_PROVIDER=${provider} is not a known provider. Known: ${PROFILE_PROVIDERS.join(", ")}.`,
    );
  }
  switch (provider) {
    case "supabase":
      return createSupabaseProfileAccessor(createServiceDbClient(env));
    case "fake":
      if (env.NODE_ENV === "production") {
        throw new Error("PROFILE_PROVIDER=fake is not allowed in a production build.");
      }
      return createFakeProfileAccessor(env);
  }
}

// The service-role client: server only, bypasses RLS, which is what an Accessor is for
// (D2). Both values come from `supabase start` locally and from the project settings
// in production (docs/setup/supabase.md).
export function createServiceDbClient(env: Environment): DbClient {
  const url = requireEnv(env, "NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv(env, "SUPABASE_SERVICE_ROLE_KEY");
  return createDbClient(url, key);
}

function requireEnv(env: Environment, name: string): string {
  const value = env[name];
  if (value === undefined || value === "") {
    throw new Error(`${name} is not set. See docs/setup/supabase.md.`);
  }
  return value;
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

function createFakeProfileAccessor(env: Environment): IProfileAccessor {
  const result = env.PROFILE_FAKE_RESULT ?? DEFAULT_FAKE_RESULT;
  if (!isFakeResult(result)) {
    throw new Error(
      `PROFILE_FAKE_RESULT=${result} is not a known result. Known: ${FAKE_RESULTS.join(", ")}.`,
    );
  }
  const state = new FakeProfileState(result === "fail");
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
