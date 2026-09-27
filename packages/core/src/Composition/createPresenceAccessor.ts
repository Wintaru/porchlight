import { FakePresenceState } from "../Accessors/PresenceAccessor/FakePresenceState";
import { FakeBroadcastPresenceHandler } from "../Accessors/PresenceAccessor/Handlers/FakeBroadcastPresenceHandler";
import { SupabaseBroadcastPresenceHandler } from "../Accessors/PresenceAccessor/Handlers/SupabaseBroadcastPresenceHandler";
import type { IPresenceAccessor } from "../Accessors/PresenceAccessor/IPresenceAccessor";
import { PresenceAccessor } from "../Accessors/PresenceAccessor/PresenceAccessor";
import { BroadcastPresenceRequest } from "../Accessors/PresenceAccessor/Requests/BroadcastPresenceRequest";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import type { Environment } from "./Environment";
import { readFakeResult, readStoreProvider } from "./readStoreProvider";
import { requireEnv } from "./createServiceDbClient";

// The Realtime channels presence goes out on (#81, D26). The same URL and service-role
// key as the database client, read only when the Supabase provider is chosen.
export function createPresenceAccessor(env: Environment): IPresenceAccessor {
  switch (readStoreProvider(env, "PRESENCE_PROVIDER")) {
    case "supabase":
      return new PresenceAccessor(
        new HandlerResolverBuilder()
          .register(
            BroadcastPresenceRequest,
            new SupabaseBroadcastPresenceHandler(
              requireEnv(env, "NEXT_PUBLIC_SUPABASE_URL"),
              requireEnv(env, "SUPABASE_SERVICE_ROLE_KEY"),
            ),
          )
          .build(),
      );
    case "fake":
      return createFakePresenceAccessor(
        new FakePresenceState(readFakeResult(env, "PRESENCE_FAKE_RESULT") === "fail"),
      );
  }
}

export function createFakePresenceAccessor(state: FakePresenceState): IPresenceAccessor {
  return new PresenceAccessor(
    new HandlerResolverBuilder()
      .register(BroadcastPresenceRequest, new FakeBroadcastPresenceHandler(state))
      .build(),
  );
}
