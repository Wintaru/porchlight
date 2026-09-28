import type { DbClient } from "@porchlight/db";

import { FakeFollowState } from "../Accessors/FollowAccessor/FakeFollowState";
import { FollowAccessor } from "../Accessors/FollowAccessor/FollowAccessor";
import { FakeLoadFollowerIdsHandler } from "../Accessors/FollowAccessor/Handlers/FakeLoadFollowerIdsHandler";
import { FakeLoadFollowsByMemberHandler } from "../Accessors/FollowAccessor/Handlers/FakeLoadFollowsByMemberHandler";
import { FakeRemoveFollowHandler } from "../Accessors/FollowAccessor/Handlers/FakeRemoveFollowHandler";
import { FakeStoreFollowHandler } from "../Accessors/FollowAccessor/Handlers/FakeStoreFollowHandler";
import { SupabaseLoadFollowsByMemberHandler } from "../Accessors/FollowAccessor/Handlers/SupabaseLoadFollowsByMemberHandler";
import { SupabaseRemoveFollowHandler } from "../Accessors/FollowAccessor/Handlers/SupabaseRemoveFollowHandler";
import { SupabaseStoreFollowHandler } from "../Accessors/FollowAccessor/Handlers/SupabaseStoreFollowHandler";
import type { IFollowAccessor } from "../Accessors/FollowAccessor/IFollowAccessor";
import { LoadFollowerIdsRequest } from "../Accessors/FollowAccessor/Requests/LoadFollowerIdsRequest";
import { LoadFollowsByMemberRequest } from "../Accessors/FollowAccessor/Requests/LoadFollowsByMemberRequest";
import { RemoveFollowRequest } from "../Accessors/FollowAccessor/Requests/RemoveFollowRequest";
import { StoreFollowRequest } from "../Accessors/FollowAccessor/Requests/StoreFollowRequest";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import type { Environment } from "./Environment";
import { readFakeResult, readStoreProvider } from "./readStoreProvider";

// The store behind follows (#24).
export function createFollowAccessor(
  env: Environment,
  db: () => DbClient,
): IFollowAccessor {
  switch (readStoreProvider(env, "FOLLOW_PROVIDER")) {
    case "supabase": {
      const client = db();
      return new FollowAccessor(
        new HandlerResolverBuilder()
          .register(StoreFollowRequest, new SupabaseStoreFollowHandler(client))
          .build(),
        new HandlerResolverBuilder()
          .register(
            LoadFollowsByMemberRequest,
            new SupabaseLoadFollowsByMemberHandler(client),
          )
          .build(),
        new HandlerResolverBuilder()
          .register(RemoveFollowRequest, new SupabaseRemoveFollowHandler(client))
          .build(),
      );
    }
    case "fake": {
      const state = new FakeFollowState(
        readFakeResult(env, "FOLLOW_FAKE_RESULT") === "fail",
      );
      return new FollowAccessor(
        new HandlerResolverBuilder()
          .register(StoreFollowRequest, new FakeStoreFollowHandler(state))
          .build(),
        new HandlerResolverBuilder()
          .register(LoadFollowsByMemberRequest, new FakeLoadFollowsByMemberHandler(state))
          .register(LoadFollowerIdsRequest, new FakeLoadFollowerIdsHandler(state))
          .build(),
        new HandlerResolverBuilder()
          .register(RemoveFollowRequest, new FakeRemoveFollowHandler(state))
          .build(),
      );
    }
  }
}
