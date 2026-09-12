import type { DbClient } from "@porchlight/db";

import { FakeReactionState } from "../Accessors/ReactionAccessor/FakeReactionState";
import { FakeRemoveReactionHandler } from "../Accessors/ReactionAccessor/Handlers/FakeRemoveReactionHandler";
import { FakeStoreReactionHandler } from "../Accessors/ReactionAccessor/Handlers/FakeStoreReactionHandler";
import { SupabaseRemoveReactionHandler } from "../Accessors/ReactionAccessor/Handlers/SupabaseRemoveReactionHandler";
import { SupabaseStoreReactionHandler } from "../Accessors/ReactionAccessor/Handlers/SupabaseStoreReactionHandler";
import type { IReactionAccessor } from "../Accessors/ReactionAccessor/IReactionAccessor";
import { ReactionAccessor } from "../Accessors/ReactionAccessor/ReactionAccessor";
import { RemoveReactionRequest } from "../Accessors/ReactionAccessor/Requests/RemoveReactionRequest";
import { StoreReactionRequest } from "../Accessors/ReactionAccessor/Requests/StoreReactionRequest";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import type { Environment } from "./Environment";
import { readFakeResult, readStoreProvider } from "./readStoreProvider";

// The store behind the reaction write path (D9).
export function createReactionAccessor(
  env: Environment,
  db: () => DbClient,
): IReactionAccessor {
  switch (readStoreProvider(env, "REACTION_PROVIDER")) {
    case "supabase": {
      const client = db();
      return new ReactionAccessor(
        new HandlerResolverBuilder()
          .register(StoreReactionRequest, new SupabaseStoreReactionHandler(client))
          .build(),
        new HandlerResolverBuilder()
          .register(RemoveReactionRequest, new SupabaseRemoveReactionHandler(client))
          .build(),
      );
    }
    case "fake": {
      const state = new FakeReactionState(
        readFakeResult(env, "REACTION_FAKE_RESULT") === "fail",
      );
      return new ReactionAccessor(
        new HandlerResolverBuilder()
          .register(StoreReactionRequest, new FakeStoreReactionHandler(state))
          .build(),
        new HandlerResolverBuilder()
          .register(RemoveReactionRequest, new FakeRemoveReactionHandler(state))
          .build(),
      );
    }
  }
}
