import type { DbClient } from "@porchlight/db";

import { FakeInviteState } from "../Accessors/InviteAccessor/FakeInviteState";
import { FakeCheckInviteHandler } from "../Accessors/InviteAccessor/Handlers/FakeCheckInviteHandler";
import { FakeListInvitesHandler } from "../Accessors/InviteAccessor/Handlers/FakeListInvitesHandler";
import { FakeMarkInviteRevokedHandler } from "../Accessors/InviteAccessor/Handlers/FakeMarkInviteRevokedHandler";
import { FakeRedeemInviteHandler } from "../Accessors/InviteAccessor/Handlers/FakeRedeemInviteHandler";
import { FakeStoreNewInviteHandler } from "../Accessors/InviteAccessor/Handlers/FakeStoreNewInviteHandler";
import { SupabaseCheckInviteHandler } from "../Accessors/InviteAccessor/Handlers/SupabaseCheckInviteHandler";
import { SupabaseListInvitesHandler } from "../Accessors/InviteAccessor/Handlers/SupabaseListInvitesHandler";
import { SupabaseMarkInviteRevokedHandler } from "../Accessors/InviteAccessor/Handlers/SupabaseMarkInviteRevokedHandler";
import { SupabaseRedeemInviteHandler } from "../Accessors/InviteAccessor/Handlers/SupabaseRedeemInviteHandler";
import { SupabaseStoreNewInviteHandler } from "../Accessors/InviteAccessor/Handlers/SupabaseStoreNewInviteHandler";
import type { IInviteAccessor } from "../Accessors/InviteAccessor/IInviteAccessor";
import { InviteAccessor } from "../Accessors/InviteAccessor/InviteAccessor";
import { CheckInviteRequest } from "../Accessors/InviteAccessor/Requests/CheckInviteRequest";
import { ListInvitesRequest } from "../Accessors/InviteAccessor/Requests/ListInvitesRequest";
import { MarkInviteRevokedRequest } from "../Accessors/InviteAccessor/Requests/MarkInviteRevokedRequest";
import { RedeemInviteRequest } from "../Accessors/InviteAccessor/Requests/RedeemInviteRequest";
import { StoreNewInviteRequest } from "../Accessors/InviteAccessor/Requests/StoreNewInviteRequest";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import type { Environment } from "./Environment";
import { readFakeResult, readStoreProvider } from "./readStoreProvider";

// The store behind invite links (#25).
export function createInviteAccessor(
  env: Environment,
  db: () => DbClient,
): IInviteAccessor {
  switch (readStoreProvider(env, "INVITE_PROVIDER")) {
    case "supabase": {
      const client = db();
      return new InviteAccessor(
        new HandlerResolverBuilder()
          .register(StoreNewInviteRequest, new SupabaseStoreNewInviteHandler(client))
          .register(
            MarkInviteRevokedRequest,
            new SupabaseMarkInviteRevokedHandler(client),
          )
          .register(RedeemInviteRequest, new SupabaseRedeemInviteHandler(client))
          .build(),
        new HandlerResolverBuilder()
          .register(ListInvitesRequest, new SupabaseListInvitesHandler(client))
          .register(CheckInviteRequest, new SupabaseCheckInviteHandler(client))
          .build(),
      );
    }
    case "fake": {
      const state = new FakeInviteState(
        readFakeResult(env, "INVITE_FAKE_RESULT") === "fail",
      );
      return new InviteAccessor(
        new HandlerResolverBuilder()
          .register(StoreNewInviteRequest, new FakeStoreNewInviteHandler(state))
          .register(MarkInviteRevokedRequest, new FakeMarkInviteRevokedHandler(state))
          .register(RedeemInviteRequest, new FakeRedeemInviteHandler(state))
          .build(),
        new HandlerResolverBuilder()
          .register(ListInvitesRequest, new FakeListInvitesHandler(state))
          .register(CheckInviteRequest, new FakeCheckInviteHandler(state))
          .build(),
      );
    }
  }
}
