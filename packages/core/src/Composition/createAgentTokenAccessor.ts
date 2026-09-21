import type { DbClient } from "@porchlight/db";

import { AgentTokenAccessor } from "../Accessors/AgentTokenAccessor/AgentTokenAccessor";
import { FakeAgentTokenState } from "../Accessors/AgentTokenAccessor/FakeAgentTokenState";
import { FakeListAgentTokensByOwnerHandler } from "../Accessors/AgentTokenAccessor/Handlers/FakeListAgentTokensByOwnerHandler";
import { FakeLoadAgentTokenByHashHandler } from "../Accessors/AgentTokenAccessor/Handlers/FakeLoadAgentTokenByHashHandler";
import { FakeMarkAgentTokenRevokedHandler } from "../Accessors/AgentTokenAccessor/Handlers/FakeMarkAgentTokenRevokedHandler";
import { FakeStoreNewAgentTokenHandler } from "../Accessors/AgentTokenAccessor/Handlers/FakeStoreNewAgentTokenHandler";
import { FakeTouchAgentTokenHandler } from "../Accessors/AgentTokenAccessor/Handlers/FakeTouchAgentTokenHandler";
import { SupabaseListAgentTokensByOwnerHandler } from "../Accessors/AgentTokenAccessor/Handlers/SupabaseListAgentTokensByOwnerHandler";
import { SupabaseLoadAgentTokenByHashHandler } from "../Accessors/AgentTokenAccessor/Handlers/SupabaseLoadAgentTokenByHashHandler";
import { SupabaseMarkAgentTokenRevokedHandler } from "../Accessors/AgentTokenAccessor/Handlers/SupabaseMarkAgentTokenRevokedHandler";
import { SupabaseStoreNewAgentTokenHandler } from "../Accessors/AgentTokenAccessor/Handlers/SupabaseStoreNewAgentTokenHandler";
import { SupabaseTouchAgentTokenHandler } from "../Accessors/AgentTokenAccessor/Handlers/SupabaseTouchAgentTokenHandler";
import type { IAgentTokenAccessor } from "../Accessors/AgentTokenAccessor/IAgentTokenAccessor";
import { ListAgentTokensByOwnerRequest } from "../Accessors/AgentTokenAccessor/Requests/ListAgentTokensByOwnerRequest";
import { LoadAgentTokenByHashRequest } from "../Accessors/AgentTokenAccessor/Requests/LoadAgentTokenByHashRequest";
import { MarkAgentTokenRevokedRequest } from "../Accessors/AgentTokenAccessor/Requests/MarkAgentTokenRevokedRequest";
import { StoreNewAgentTokenRequest } from "../Accessors/AgentTokenAccessor/Requests/StoreNewAgentTokenRequest";
import { TouchAgentTokenRequest } from "../Accessors/AgentTokenAccessor/Requests/TouchAgentTokenRequest";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import type { Environment } from "./Environment";
import { readFakeResult, readStoreProvider } from "./readStoreProvider";

// The store behind a member's personal agent tokens (SPEC.md §17, D22).
export function createAgentTokenAccessor(
  env: Environment,
  db: () => DbClient,
): IAgentTokenAccessor {
  switch (readStoreProvider(env, "AGENT_TOKEN_PROVIDER")) {
    case "supabase":
      return createSupabaseAgentTokenAccessor(db());
    case "fake":
      return createFakeAgentTokenAccessor(
        new FakeAgentTokenState(
          readFakeResult(env, "AGENT_TOKEN_FAKE_RESULT") === "fail",
        ),
      );
  }
}

function createSupabaseAgentTokenAccessor(db: DbClient): IAgentTokenAccessor {
  return new AgentTokenAccessor(
    new HandlerResolverBuilder()
      .register(StoreNewAgentTokenRequest, new SupabaseStoreNewAgentTokenHandler(db))
      .register(
        MarkAgentTokenRevokedRequest,
        new SupabaseMarkAgentTokenRevokedHandler(db),
      )
      .register(TouchAgentTokenRequest, new SupabaseTouchAgentTokenHandler(db))
      .build(),
    new HandlerResolverBuilder()
      .register(LoadAgentTokenByHashRequest, new SupabaseLoadAgentTokenByHashHandler(db))
      .register(
        ListAgentTokensByOwnerRequest,
        new SupabaseListAgentTokensByOwnerHandler(db),
      )
      .build(),
  );
}

// Exported for the Manager tests, the same way the site config fake is.
export function createFakeAgentTokenAccessor(
  state: FakeAgentTokenState,
): IAgentTokenAccessor {
  return new AgentTokenAccessor(
    new HandlerResolverBuilder()
      .register(StoreNewAgentTokenRequest, new FakeStoreNewAgentTokenHandler(state))
      .register(MarkAgentTokenRevokedRequest, new FakeMarkAgentTokenRevokedHandler(state))
      .register(TouchAgentTokenRequest, new FakeTouchAgentTokenHandler(state))
      .build(),
    new HandlerResolverBuilder()
      .register(LoadAgentTokenByHashRequest, new FakeLoadAgentTokenByHashHandler(state))
      .register(
        ListAgentTokensByOwnerRequest,
        new FakeListAgentTokensByOwnerHandler(state),
      )
      .build(),
  );
}
