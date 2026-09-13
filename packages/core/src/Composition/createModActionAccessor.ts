import type { DbClient } from "@porchlight/db";

import { FakeModActionState } from "../Accessors/ModActionAccessor/FakeModActionState";
import { FakeRecordModActionHandler } from "../Accessors/ModActionAccessor/Handlers/FakeRecordModActionHandler";
import { SupabaseRecordModActionHandler } from "../Accessors/ModActionAccessor/Handlers/SupabaseRecordModActionHandler";
import type { IModActionAccessor } from "../Accessors/ModActionAccessor/IModActionAccessor";
import { ModActionAccessor } from "../Accessors/ModActionAccessor/ModActionAccessor";
import { RecordModActionRequest } from "../Accessors/ModActionAccessor/Requests/RecordModActionRequest";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import type { Environment } from "./Environment";
import { readFakeResult, readStoreProvider } from "./readStoreProvider";

// The store behind the append-only mod_actions record (SPEC.md §7).
export function createModActionAccessor(
  env: Environment,
  db: () => DbClient,
): IModActionAccessor {
  switch (readStoreProvider(env, "MOD_ACTION_PROVIDER")) {
    case "supabase":
      return new ModActionAccessor(
        new HandlerResolverBuilder()
          .register(RecordModActionRequest, new SupabaseRecordModActionHandler(db()))
          .build(),
      );
    case "fake": {
      const state = new FakeModActionState(
        readFakeResult(env, "MOD_ACTION_FAKE_RESULT") === "fail",
      );
      return new ModActionAccessor(
        new HandlerResolverBuilder()
          .register(RecordModActionRequest, new FakeRecordModActionHandler(state))
          .build(),
      );
    }
  }
}
