import type { DbClient } from "@porchlight/db";

import { FakeMemberBlockState } from "../Accessors/MemberBlockAccessor/FakeMemberBlockState";
import { FakeLoadMemberBlocksByMemberHandler } from "../Accessors/MemberBlockAccessor/Handlers/FakeLoadMemberBlocksByMemberHandler";
import { FakeLoadMemberBlocksOfTargetHandler } from "../Accessors/MemberBlockAccessor/Handlers/FakeLoadMemberBlocksOfTargetHandler";
import { FakeRemoveMemberBlockHandler } from "../Accessors/MemberBlockAccessor/Handlers/FakeRemoveMemberBlockHandler";
import { FakeStoreMemberBlockHandler } from "../Accessors/MemberBlockAccessor/Handlers/FakeStoreMemberBlockHandler";
import { SupabaseLoadMemberBlocksByMemberHandler } from "../Accessors/MemberBlockAccessor/Handlers/SupabaseLoadMemberBlocksByMemberHandler";
import { SupabaseLoadMemberBlocksOfTargetHandler } from "../Accessors/MemberBlockAccessor/Handlers/SupabaseLoadMemberBlocksOfTargetHandler";
import { SupabaseRemoveMemberBlockHandler } from "../Accessors/MemberBlockAccessor/Handlers/SupabaseRemoveMemberBlockHandler";
import { SupabaseStoreMemberBlockHandler } from "../Accessors/MemberBlockAccessor/Handlers/SupabaseStoreMemberBlockHandler";
import type { IMemberBlockAccessor } from "../Accessors/MemberBlockAccessor/IMemberBlockAccessor";
import { MemberBlockAccessor } from "../Accessors/MemberBlockAccessor/MemberBlockAccessor";
import { LoadMemberBlocksByMemberRequest } from "../Accessors/MemberBlockAccessor/Requests/LoadMemberBlocksByMemberRequest";
import { LoadMemberBlocksOfTargetRequest } from "../Accessors/MemberBlockAccessor/Requests/LoadMemberBlocksOfTargetRequest";
import { RemoveMemberBlockRequest } from "../Accessors/MemberBlockAccessor/Requests/RemoveMemberBlockRequest";
import { StoreMemberBlockRequest } from "../Accessors/MemberBlockAccessor/Requests/StoreMemberBlockRequest";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import type { Environment } from "./Environment";
import { readFakeResult, readStoreProvider } from "./readStoreProvider";

// The store behind member mutes and blocks (#23).
export function createMemberBlockAccessor(
  env: Environment,
  db: () => DbClient,
): IMemberBlockAccessor {
  switch (readStoreProvider(env, "MEMBER_BLOCK_PROVIDER")) {
    case "supabase": {
      const client = db();
      return new MemberBlockAccessor(
        new HandlerResolverBuilder()
          .register(StoreMemberBlockRequest, new SupabaseStoreMemberBlockHandler(client))
          .build(),
        new HandlerResolverBuilder()
          .register(
            LoadMemberBlocksByMemberRequest,
            new SupabaseLoadMemberBlocksByMemberHandler(client),
          )
          .register(
            LoadMemberBlocksOfTargetRequest,
            new SupabaseLoadMemberBlocksOfTargetHandler(client),
          )
          .build(),
        new HandlerResolverBuilder()
          .register(
            RemoveMemberBlockRequest,
            new SupabaseRemoveMemberBlockHandler(client),
          )
          .build(),
      );
    }
    case "fake": {
      const state = new FakeMemberBlockState(
        readFakeResult(env, "MEMBER_BLOCK_FAKE_RESULT") === "fail",
      );
      return new MemberBlockAccessor(
        new HandlerResolverBuilder()
          .register(StoreMemberBlockRequest, new FakeStoreMemberBlockHandler(state))
          .build(),
        new HandlerResolverBuilder()
          .register(
            LoadMemberBlocksByMemberRequest,
            new FakeLoadMemberBlocksByMemberHandler(state),
          )
          .register(
            LoadMemberBlocksOfTargetRequest,
            new FakeLoadMemberBlocksOfTargetHandler(state),
          )
          .build(),
        new HandlerResolverBuilder()
          .register(RemoveMemberBlockRequest, new FakeRemoveMemberBlockHandler(state))
          .build(),
      );
    }
  }
}
