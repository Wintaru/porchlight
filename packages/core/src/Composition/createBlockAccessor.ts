import type { DbClient } from "@porchlight/db";

import { BlockAccessor } from "../Accessors/BlockAccessor/BlockAccessor";
import { FakeBlockState } from "../Accessors/BlockAccessor/FakeBlockState";
import { FakeCheckAnonymousBlockHandler } from "../Accessors/BlockAccessor/Handlers/FakeCheckAnonymousBlockHandler";
import { FakeCreateBlockHandler } from "../Accessors/BlockAccessor/Handlers/FakeCreateBlockHandler";
import { SupabaseCheckAnonymousBlockHandler } from "../Accessors/BlockAccessor/Handlers/SupabaseCheckAnonymousBlockHandler";
import { SupabaseCreateBlockHandler } from "../Accessors/BlockAccessor/Handlers/SupabaseCreateBlockHandler";
import type { IBlockAccessor } from "../Accessors/BlockAccessor/IBlockAccessor";
import { CheckAnonymousBlockRequest } from "../Accessors/BlockAccessor/Requests/CheckAnonymousBlockRequest";
import { CreateBlockRequest } from "../Accessors/BlockAccessor/Requests/CreateBlockRequest";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import type { Environment } from "./Environment";
import { readFakeResult, readStoreProvider } from "./readStoreProvider";

// The store behind the D15 block list.
export function createBlockAccessor(
  env: Environment,
  db: () => DbClient,
): IBlockAccessor {
  switch (readStoreProvider(env, "BLOCK_PROVIDER")) {
    case "supabase":
      return new BlockAccessor(
        new HandlerResolverBuilder()
          .register(CreateBlockRequest, new SupabaseCreateBlockHandler(db()))
          .build(),
        new HandlerResolverBuilder()
          .register(
            CheckAnonymousBlockRequest,
            new SupabaseCheckAnonymousBlockHandler(db()),
          )
          .build(),
      );
    case "fake": {
      const state = new FakeBlockState(
        readFakeResult(env, "BLOCK_FAKE_RESULT") === "fail",
      );
      return new BlockAccessor(
        new HandlerResolverBuilder()
          .register(CreateBlockRequest, new FakeCreateBlockHandler(state))
          .build(),
        new HandlerResolverBuilder()
          .register(CheckAnonymousBlockRequest, new FakeCheckAnonymousBlockHandler(state))
          .build(),
      );
    }
  }
}
